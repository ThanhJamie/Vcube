import { AiCadAssistantMessage } from '../types';
import { getGeminiClient, GEMINI_MODEL_DEFAULT } from './geminiClient';

export class CadAssistantService {
  static async sendChatMessage(
    userMessage: string,
    history: AiCadAssistantMessage[] = []
  ): Promise<AiCadAssistantMessage> {
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Bạn là Trợ lý AI Kỹ thuật CAD và In 3D của VCUBE Vietnam.
Nhiệm vụ của bạn:
1. Hỗ trợ thiết kế chi tiết máy, chuẩn hóa dung sai lắp ghép (clearance 0.2-0.4mm cho FDM, 0.1mm cho SLA).
2. Tư vấn khắc phục lỗi in 3D: Stringing (kéo tơ), Warping (cong đáy), Delamination (tách lớp).
3. Nếu người dùng yêu cầu tạo hình học cơ bản hoặc script, hãy xuất mã OpenSCAD hoặc hướng dẫn CAD SolidWorks/Fusion360 rõ ràng.
4. Trả lời bằng tiếng Việt chuyên nghiệp, ngắn gọn, súc tích và chính xác.

Câu hỏi của kỹ sư/khách hàng: "${userMessage}"`;

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL_DEFAULT,
          contents: prompt,
        });

        const replyText = response.text || 'Tôi đã tiếp nhận yêu cầu kỹ thuật của bạn.';
        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          timestamp: new Date().toISOString(),
          suggestedActions: [
            'Kiểm tra dung sai lỗ ren M3/M4',
            'Tư vấn vật liệu sợi Carbon PETG-CF',
            'Tối ưu góc nhô hỗ trợ support',
          ],
        };
      } catch (e) {
        console.warn('Gemini chat note (fallback to local CAD knowledge):', e);
      }
    }

    // Heuristic response
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `VCUBE AI CAD Assistant đã ghi nhận yêu cầu: "${userMessage}".
- Để lắp ghép mượt mà với trục bu lông M3/M4, khuyến nghị tạo lỗ danh định 3.2mm hoặc 4.2mm để bù trừ co ngót nhựa.
- Với các chi tiết chịu nhiệt trên 70°C, khuyến nghị chuyển sang vật liệu PETG hoặc PA12-CF.`,
      timestamp: new Date().toISOString(),
      suggestedActions: [
        'Tính toán dung sai lắp ghép',
        'So sánh vật liệu FDM vs SLA',
        'Tải báo giá in tức thì',
      ],
    };
  }
}
