import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'build',emptyOutDir:true,minify:true},define:{'process.env.NODE_ENV':'"production"'}});
