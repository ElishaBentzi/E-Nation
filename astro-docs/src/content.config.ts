import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // No se declara la coleccion `i18n`: Starlight ya trae las traducciones de
  // interfaz para es/en/fr, y declararla vacia solo producia un aviso de
  // "coleccion inexistente". Se anadira si algun dia hay que sobreescribir
  // alguna cadena concreta.
};
