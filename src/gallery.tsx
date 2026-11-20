import React, {useEffect, useRef, useState} from 'react';
import {galleryColors, type GalleryPhoto} from '../server/gallery';
import {call} from './transport';

async function resizePhoto(file: File) {
  if (!file.type.startsWith('image/')) throw Error('Selecione uma imagem.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.85, .7, .55, .4]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= 400000) return data;
    }
    throw Error('A imagem é muito grande. Escolha uma foto menor.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function Gallery({admin = false}: {admin?: boolean}) {
  const [color, setColor] = useState('');
  const [page, setPage] = useState(1);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  const [uploadColor, setUploadColor] = useState<string>(galleryColors[0]);
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const query = new URLSearchParams({op:'gallery',color,page:String(page)});
    fetch('/.netlify/functions/api?' + query).then(async response => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Não foi possível carregar as fotos.');
      if (active) {
        setPhotos(data.photos);
        setMore(data.more);
        if (!data.photos.length && page > 1) setPage(page - 1);
      }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [color, page, version]);

  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setNotice('');
    try {
      await call('gallery', {action:'add',color:uploadColor,caption:caption.trim(),image:await resizePhoto(file)});
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setCaption('');
      setColor(uploadColor);
      setPage(1);
      setVersion(value => value + 1);
      setNotice('Foto publicada na galeria!');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Falha ao salvar a foto.');
    } finally { setBusy(false); }
  }

  async function remove(photo: GalleryPhoto) {
    if (busy || !window.confirm('Excluir esta foto da galeria do site?')) return;
    setBusy(true);
    setNotice('');
    try {
      await call('gallery', {action:'remove',id:photo.id});
      setVersion(value => value + 1);
      setNotice('Foto excluída.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Falha ao excluir a foto.');
    } finally { setBusy(false); }
  }

  return <section className="studio-gallery" id="galeria" aria-labelledby="gallery-title">
    <div className="studio-section-heading">
      <h2 id="gallery-title">{admin ? 'Gerenciar galeria' : 'Nossa galeria de cabelos'}</h2>
      <p>{admin ? 'Publique fotos dos seus trabalhos por tonalidade.' : 'Encontre inspiração para sua próxima transformação.'}</p>
    </div>
    {admin && <form className="card gallery-upload" onSubmit={upload}>
      <label>Cor do cabelo<select value={uploadColor} onChange={e => setUploadColor(e.target.value)}>{galleryColors.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Legenda (opcional)<input value={caption} maxLength={120} onChange={e => setCaption(e.target.value)} placeholder="Ex.: Mega hair loiro mesclado"/></label>
      <label>Foto<input ref={fileInput} type="file" accept="image/*" required onChange={e => setFile(e.target.files?.[0] || null)}/></label>
      <button className="primary" disabled={!file || busy}>{busy ? 'Salvando…' : 'Publicar foto'}</button>
      {notice && <p role="status">{notice}</p>}
    </form>}
    <div className="gallery-colors" role="group" aria-label="Filtrar por cor">
      {['', ...galleryColors].map(value => <button type="button" key={value} aria-pressed={color === value} onClick={() => {setColor(value);setPage(1);}}>{value || 'Todas as cores'}</button>)}
    </div>
    {loading ? <p role="status">Carregando fotos…</p> : error ? <p role="alert">{error} <button className="secondary" onClick={() => setVersion(value => value + 1)}>Tentar novamente</button></p> :
      photos.length ? <div className="gallery-grid">{photos.map(photo => <article key={photo.id}>
        <button className="gallery-image" type="button" onClick={() => setSelected(photo)} aria-label={'Ampliar foto: ' + (photo.caption || photo.color)}>
          <img src={photo.image} alt={photo.caption || 'Cabelo na tonalidade ' + photo.color} loading="lazy"/>
        </button>
        <div className="gallery-caption"><strong>{photo.color}</strong>{photo.caption && <span>{photo.caption}</span>}
        {admin && <button className="danger" disabled={busy} onClick={() => remove(photo)}>Excluir foto</button>}</div>
      </article>)}</div> : <p className="gallery-empty">{admin ? 'Nenhuma foto nesta categoria. Publique a primeira acima.' : 'Em breve, mais inspirações nesta tonalidade.'}</p>}
    {!loading && !error && (page > 1 || more) && <nav className="gallery-pagination" aria-label="Páginas da galeria">
      <button type="button" className="secondary" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
      <span>Página {page}</span>
      <button type="button" className="secondary" disabled={!more} onClick={() => setPage(value => value + 1)}>Próxima</button>
    </nav>}
    <dialog ref={dialog} className="gallery-dialog" onClose={() => setSelected(null)} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      {selected && <><button type="button" className="secondary" onClick={() => dialog.current?.close()}>Fechar</button><img src={selected.image} alt={selected.caption || selected.color}/><p>{selected.caption || selected.color}</p></>}
    </dialog>
  </section>;
}
