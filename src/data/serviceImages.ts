// TODO: substituir por fotos reais da loja
// Mapeamento de imagens Unsplash por serviço — cada serviço tem 1 imagem placeholder
// que se repete para totalImages. As URLs são de fotos reais do Unsplash relacionadas
// à categoria do eletrodoméstico.

export const serviceImageMap: Record<string, string[]> = {
  // Linha Branca
  "lb-maquina-lavar": [
    "https://images.unsplash.com/photo-1626806775351-538068a21838?w=600&h=400&fit=crop",
  ],
  "lb-maquina-lava-seca": [
    "https://images.unsplash.com/photo-1626806775351-538068a21838?w=600&h=400&fit=crop",
  ],
  "lb-geladeira": [
    "https://images.unsplash.com/photo-1571175443880-49e1d58b794a?w=600&h=400&fit=crop",
  ],
  "lb-adega": [
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop",
  ],
  "lb-tanquinho": [
    "https://images.unsplash.com/photo-1626806775351-538068a21838?w=600&h=400&fit=crop",
  ],
  "lb-bebedouro": [
    "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=400&fit=crop",
  ],
  // Pequenos Eletrodomésticos
  "pe-sanduicheira": [
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=400&fit=crop",
  ],
  "pe-air-fryer": [
    "https://images.unsplash.com/photo-1626147116986-4601771470a6?w=600&h=400&fit=crop",
  ],
  "pe-cafeteira": [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop",
  ],
  "pe-liquidificador": [
    "https://images.unsplash.com/photo-1570222094114-28a9d8896b73?w=600&h=400&fit=crop",
  ],
  "pe-batedeira": [
    "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=600&h=400&fit=crop",
  ],
  "pe-micro-ondas": [
    "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600&h=400&fit=crop",
  ],
  "pe-forno-eletrico": [
    "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=600&h=400&fit=crop",
  ],
  "pe-ferro": [
    "https://images.unsplash.com/photo-1582735689369-4fe89db7116c?w=600&h=400&fit=crop",
  ],
  "pe-prancha": [
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=400&fit=crop",
  ],
  // Climatização
  "cl-climatizador": [
    "https://images.unsplash.com/photo-1631545308772-81a0e0a3a6ae?w=600&h=400&fit=crop",
  ],
  "cl-higienizacao-lavar": [
    "https://images.unsplash.com/photo-1626806775351-538068a21838?w=600&h=400&fit=crop",
  ],
  "cl-higienizacao-ar": [
    "https://images.unsplash.com/photo-1631545308772-81a0e0a3a6ae?w=600&h=400&fit=crop",
  ],
  // Ferramentas
  "fe-parafusadeira": [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=400&fit=crop",
  ],
  "fe-makita": [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=400&fit=crop",
  ],
  "fe-lixadeira": [
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=400&fit=crop",
  ],
  "fe-aspirador": [
    "https://images.unsplash.com/photo-1558317374-a3545eca46f2?w=600&h=400&fit=crop",
  ],
  "fe-wap": [
    "https://images.unsplash.com/photo-1558317374-a3545eca46f2?w=600&h=400&fit=crop",
  ],
  // Entretenimento
  "em-ventilador": [
    "https://images.unsplash.com/photo-1631545308772-81a0e0a3a6ae?w=600&h=400&fit=crop",
  ],
  "em-radio-bluetooth": [
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&h=400&fit=crop",
  ],
  "em-scooter-eletrica": [
    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&h=400&fit=crop",
  ],
  // Inverter
  "inv-ar-condicionado": [
    "https://images.unsplash.com/photo-1631545308772-81a0e0a3a6ae?w=600&h=400&fit=crop",
  ],
  "inv-inversores-solares": [
    "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop",
  ],
  "inv-fontes-chaveadas": [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
  ],
};

export function getServiceImages(serviceId: string, totalImages: number): string[] {
  const base = serviceImageMap[serviceId] || [
    "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&h=400&fit=crop",
  ];
  // Repete a mesma imagem para totalImages
  return Array.from({ length: totalImages }, () => base[0]);
}
