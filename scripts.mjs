import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
let html=readFileSync('build/index.html','utf8');
for(const m of [...html.matchAll(/<script[^>]*src="([^\"]+)"[^>]*><\/script>/g)]){const path=m[1].replace(/^\.\//,'');const js=readFileSync('build/'+path,'utf8').replace(/<\/script/gi,'<\\/script');html=html.replace(m[0],()=>'<script type="module">'+js+'</script>');}
for(const m of [...html.matchAll(/<link[^>]*href="([^\"]+\.css)"[^>]*>/g)]){const path=m[1].replace(/^\.\//,'');html=html.replace(m[0],()=>'<style>'+readFileSync('build/'+path,'utf8')+'</style>');}
mkdirSync('public',{recursive:true});writeFileSync('public/index.html',html);mkdirSync('codepen',{recursive:true});const demo=html.replace('<head>','<head><script>window.STUDIO_DEMO=true;</script>');writeFileSync('codepen/cole-no-codepen.html',demo);console.log('Gerados: public/index.html e codepen/cole-no-codepen.html');
