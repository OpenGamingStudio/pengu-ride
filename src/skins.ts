export type Hat = 'none' | 'beanie' | 'crown' | 'party' | 'helmet' | 'band';
export interface Skin {
  id: string;
  name: string;
  price: number;
  body: string;
  belly: string;
  scarf: string | null;
  hat: Hat;
  hatColor: string;
}

export const SKINS: Skin[] = [
  { id: 'classic', name: 'Classique', price: 0, body: '#14213d', belly: '#ffffff', scarf: null, hat: 'none', hatColor: '#ff8a1f' },
  { id: 'beanie', name: 'Bonnet rouge', price: 30, body: '#14213d', belly: '#ffffff', scarf: null, hat: 'beanie', hatColor: '#e63946' },
  { id: 'scarf', name: 'Écharpe verte', price: 50, body: '#14213d', belly: '#ffffff', scarf: '#2fbf71', hat: 'none', hatColor: '#ff8a1f' },
  { id: 'band', name: 'Bandeau sport', price: 80, body: '#2a4d9b', belly: '#e8f1ff', scarf: null, hat: 'band', hatColor: '#ffd60a' },
  { id: 'party', name: 'Pingouin fête', price: 120, body: '#7b3fb8', belly: '#ffe3f4', scarf: '#ff4f9a', hat: 'party', hatColor: '#ffd60a' },
  { id: 'helmet', name: 'Casque de course', price: 180, body: '#e63946', belly: '#fff4e0', scarf: null, hat: 'helmet', hatColor: '#ffd60a' },
  { id: 'royal', name: 'Roi des glaces', price: 260, body: '#14213d', belly: '#ffffff', scarf: '#9b2fd1', hat: 'crown', hatColor: '#ffd60a' },
  { id: 'gold', name: 'Pingouin doré', price: 400, body: '#e0a100', belly: '#fff2b8', scarf: '#14213d', hat: 'crown', hatColor: '#ffffff' },
];

export const skinById = (id: string): Skin => SKINS.find((s) => s.id === id) ?? SKINS[0];
