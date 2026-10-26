'use client';

import { usePagodaAccess } from './pagoda-access-context';
import { ChevronDown } from 'lucide-react';

export function PagodaSwitcher() {
  const { activePagoda, pagodas, selectPagoda } = usePagodaAccess();

  return <label className="pagoda-switcher">Chùa đang quản trị
    <span className="pagoda-switcher-control"><select aria-label="Chùa đang quản trị" value={activePagoda.id} onChange={(event) => selectPagoda(event.target.value)}>
      {pagodas.map((pagoda) => <option key={pagoda.id} value={pagoda.id}>{pagoda.name}</option>)}
    </select><ChevronDown aria-hidden="true" /></span>
  </label>;
}
