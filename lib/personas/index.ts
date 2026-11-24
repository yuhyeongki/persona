import { KEPLER, type Persona } from "./kepler";

// 인물을 추가하려면 새 파일을 만들고 여기에 등록하세요.
const PERSONAS: Record<string, Persona> = {
  [KEPLER.key]: KEPLER,
};

export function getPersona(key: string): Persona {
  return PERSONAS[key] ?? KEPLER;
}

export type { Persona };
