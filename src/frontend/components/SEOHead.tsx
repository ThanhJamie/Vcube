import React, { useEffect } from 'react';

export interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  schema?: Record<string, any>;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  schema
}) => {
  useEffect(() => {
    // 1. Set document title
    const fullTitle = `${title} | VCUBE Vietnam Precision Additive Manufacturing`;
    document.title = fullTitle;

    // Helper to update or create meta tag
    const setMeta = (nameAttr: 'name' | 'property', nameVal: string, content: string) => {
      let element = document.querySelector(`meta[${nameAttr}="${nameVal}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, nameVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Không có ảnh thật ⇒ GỠ meta cũ, KHÔNG rơi về ảnh stock bịa (data-honesty).
    const removeMeta = (nameAttr: 'name' | 'property', nameVal: string) => {
      document.querySelector(`meta[${nameAttr}="${nameVal}"]`)?.remove();
    };

    // 2. Standard Meta Tags
    setMeta('name', 'description', description);
    setMeta('name', 'robots', 'index, follow');

    // 3. OpenGraph Tags
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    if (image) {
      setMeta('property', 'og:image', image);
    } else {
      removeMeta('property', 'og:image');
    }
    if (url) {
      setMeta('property', 'og:url', url);
    }

    // 4. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    if (image) {
      setMeta('name', 'twitter:image', image);
    } else {
      removeMeta('name', 'twitter:image');
    }

    // 5. JSON-LD Structured Data Schema
    let scriptTag = document.getElementById('vcube-schema-ld') as HTMLScriptElement | null;
    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'vcube-schema-ld';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [title, description, image, url, type, schema]);

  return null;
};

