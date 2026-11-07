import React,{useState} from 'react';
type OldRow={data:string;horario:string;nome:string;whatsapp:string;procedimento:string;valor:string;observacoes:string;horario_original:string};
type Props={onImport:(rows:OldRow[])=>Promise<{imported:number;skipped:{date:string;time:string;name:string;reason:string}[];received:number}>,onDone:()=>void};
const columns=['data','horario','nome','whatsapp','procedimento','valor','observacoes'];
function parseCsv(text:string):OldRow[]{
 const first=text.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0],delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
 const all:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))all.push(row);row=[];field=''}else field+=c}
 row.push(field);if(row.some(v=>v.trim()))all.push(row);
 const headers=(all.shift()||[]).map(v=>v.replace(/^\uFEFF/,'').trim().toLowerCase());if(!columns.every(c=>headers.includes(c)))throw Error('CSV incompatível. Use o arquivo agendamentos.csv ou agendamentos_excel.csv da agenda antiga.');
 return all.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]||''])) as OldRow);
}
export default function LegacyImport({onImport,onDone}:Props){
 const[rows,setRows]=useState<OldRow[]>([]),[filename,setFilename]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<{imported:number;skipped:{date:string;time:string;name:string;reason:string}[];received:number}|null>(null);
 async function select(file?:File){setResult(null);setError('');setRows([]);if(!file)return;if(file.size>1024*1024){setError('Arquivo muito grande (limite 1 MB).');return}try{const txt=await file.text(),v=file.name.toLowerCase().endsWith('.json')?JSON.parse(txt.replace(/^\uFEFF/,'')):parseCsv(txt);if(!Array.isArray(v)||v.length<1||v.length>200||!v.every(r=>r&&typeof r==='object'&&columns.every(c=>c in r)))throw Error('Arquivo inválido. Aceitamos até 200 registros no formato da agenda antiga.');setRows(v);setFilename(file.name)}catch(e){setError(e instanceof Error?e.message:'Não foi possível ler o arquivo.')}}
 async function start(){setBusy(true);setError('');try{const r=await onImport(rows);setResult(r);if(r.imported)onDone()}catch(e){setError(e instanceof Error?e.message:'Falha na importação.')}finally{setBusy(false)}}
 return <section className="card legacy-import"><h3>Importar agenda antiga</h3><p>Selecione o JSON ou CSV que você enviou. Confira os registros antes de importar. Reservas existentes não serão substituídas.</p>
 <label>Arquivo da agenda antiga (.json ou .csv)<input type="file" accept=".json,.csv,application/json,text/csv" disabled={busy} onChange={e=>select(e.target.files?.[0])}/></label>
 {error&&<p role="alert" className="client-error">{error}</p>}
 {rows.length>0&&!result&&<><p><strong>{rows.length} agendamentos encontrados</strong> — {filename}</p><div className="legacy-preview"><table><thead><tr><th>Data</th><th>Hora</th><th>Cliente</th><th>Serviço</th><th>Valor</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{r.data}</td><td>{r.horario}</td><td>{r.nome}</td><td>{r.procedimento}</td><td>{r.valor||'A confirmar'}</td></tr>)}</tbody></table></div><p>O sistema preservará os horários ajustados do arquivo e anotará os horários originais quando forem diferentes. Agendamentos sem telefone ou valor poderão ser conferidos depois.</p><button type="button" className="primary" disabled={busy} onClick={start}>{busy?'Importando…':'Confirmar importação'}</button></>}
 {result&&<div role="status"><p><strong>{result.imported} registros importados.</strong> {result.skipped.length} ignorados por conflito de horário.</p>{result.skipped.length>0&&<ul>{result.skipped.map((r,i)=><li key={i}>{r.date} {r.time} — {r.name}: {r.reason}</li>)}</ul>}</div>}
 </section>
}
