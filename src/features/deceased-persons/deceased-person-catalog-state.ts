import { DeceasedPerson } from './deceased-person-domain';

export interface DeceasedPersonCatalogState { people: DeceasedPerson[]; }
export type DeceasedPersonCatalogAction = { type: 'catalog-loaded'; people: DeceasedPerson[] } | { type: 'person-added'; person: DeceasedPerson } | { type: 'people-imported'; people: DeceasedPerson[] };
export function deceasedPersonCatalogReducer(state: DeceasedPersonCatalogState, action: DeceasedPersonCatalogAction): DeceasedPersonCatalogState {
  if (action.type === 'catalog-loaded') return { people: action.people };
  return action.type === 'person-added' ? { people: [...state.people, action.person] } : { people: [...state.people, ...action.people] };
}
