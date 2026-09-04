import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-order-token',
};

// HMAC SHA-256 in Deno
async function signHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      printHours = 2.5,
      postProcessingHours = 0.5,
      grams = 120,
      machine = { avgPowerKW: 0.18, purchasePrice: 28000000, lifetimeHours: 8000 },
      material = { pricePerKg: 280000 },
      accessories = [],
      globalSettings = {
        electricityRateVndKwh: 2850,
        defaultLaborRateVndHour: 65000,
        defaultScrapRatePercent: 5,
        profitMode: 'Markup',
        defaultProfitPercent: 35
      }
    } = await req.json();

    const electricityRate = Number(globalSettings.electricityRateVndKwh) || 2850;
    const laborRate = Number(globalSettings.defaultLaborRateVndHour) || 65000;
    const scrapPercent = (Number(globalSettings.defaultScrapRatePercent) || 5) / 100;
    const profitPercent = (Number(globalSettings.defaultProfitPercent) || 35) / 100;
    const profitMode = globalSettings.profitMode || 'Markup';

    // 1. Machine
    const depreciationPerHour = Math.round((machine.purchasePrice || 25000000) / (machine.lifetimeHours || 8000));
    const electricityPerHour = Math.round((machine.avgPowerKW || 0.18) * electricityRate);
    const machineCost = Math.round((depreciationPerHour + electricityPerHour) * printHours);

    // 2. Material
    const materialCost = Math.round((grams / 1000) * (material.pricePerKg || 280000));

    // 3. Labor
    const laborCost = Math.round((printHours + postProcessingHours) * laborRate);

    // 4. Accessories
    let accessoriesCost = 0;
    for (const acc of accessories) {
      if (acc.usedQty && acc.packQty && acc.packPrice) {
        accessoriesCost += Math.round((acc.usedQty / acc.packQty) * acc.packPrice);
      }
    }

    // 5. Overhead
    const overhead = 50000; // default allocated
    const rawBaseCost = machineCost + materialCost + laborCost + accessoriesCost + overhead;
    const scrapReserve = Math.round(rawBaseCost * scrapPercent);
    const finalCost = rawBaseCost + scrapReserve;

    let finalSellingPrice = 0;
    if (profitMode === 'Markup') {
      finalSellingPrice = Math.round(finalCost * (1 + profitPercent));
    } else {
      finalSellingPrice = Math.round(finalCost / Math.max(0.01, 1 - profitPercent));
    }

    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000; // 15 min TTL
    const nonce = Math.random().toString(36).substring(2, 10);
    const quoteId = `QUO-EDGE-${now}`;

    const secret = Deno.env.get('QUOTE_SIGNING_SECRET') || 'vcube_inkiri_hmac_secret_2026_industrial_fab';
    const sigPayload = JSON.stringify({
      id: quoteId,
      total: finalSellingPrice,
      grams,
      hours: printHours,
      exp: expiresAt,
      nonce
    });

    const signature = await signHmac(sigPayload, secret);

    return new Response(
      JSON.stringify({
        success: true,
        quoteId,
        finalSellingPrice,
        finalCost,
        breakdown: {
          machineCost,
          materialCost,
          laborCost,
          accessoriesCost,
          overhead,
          scrapReserve
        },
        validUntil: expiresAt,
        token: {
          quoteId,
          finalSellingPrice,
          expiresAt,
          nonce,
          signature
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
