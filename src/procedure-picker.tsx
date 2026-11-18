import React from 'react';
import {money, priceFor, type Service} from './studio';

type Props = {
  services: Service[];
  selected: string[];
  onChange: (ids: string[]) => void;
  adjustment: number;
  date: string;
};

export default function ProcedurePicker({services, selected, onChange, adjustment, date}: Props) {
  const next = services.find(service => !selected.includes(service.id));

  return <div>
    {selected.map((id, index) => <div className="procedure-row" key={index}>
      <label className="client-label">Procedimento {index + 1}
        <select required value={services.some(service => service.id === id) ? id : ''}
          onChange={event => onChange(selected.map((current, position) => position === index ? event.target.value : current))}>
          <option value="" disabled>Selecione um procedimento</option>
          {services.filter(service => service.id === id || !selected.includes(service.id)).map(service =>
            <option key={service.id} value={service.id}>{service.name} — {money(priceFor(service, {adjustment}, date))}</option>
          )}
        </select>
      </label>
      {selected.length > 1 && <button type="button" className="secondary" aria-label={'Remover procedimento ' + (index + 1)}
        onClick={() => onChange(selected.filter((_, position) => position !== index))}>Remover</button>}
      {services.find(service => service.id === id)?.note && <small className="procedure-note">{services.find(service => service.id === id)?.note}</small>}
    </div>)}
    {next && !selected.includes('') && <button type="button" className="secondary" onClick={() => onChange([...selected, ''])}>
      {selected.length ? 'Adicionar procedimento' : 'Selecionar procedimento'}
    </button>}
  </div>;
}
