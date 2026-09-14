/*
 * Valida la sintaxis de un archivo PHP sin necesidad de tener PHP instalado.
 *
 * POR QUE EXISTE
 *   En este proyecto escribimos PHP que se ejecuta en el servidor de WordPress
 *   (el extractor de contenido), pero la maquina de desarrollo no tiene PHP. Sin
 *   validacion, un error de sintaxis se descubre subiendo el archivo al
 *   servidor y viendo un error 500, que es una forma cara y lenta de enterarse.
 *
 * USO
 *   node tools/validate-php.mjs tools/wp-extract.php
 *
 * Exit 0 si la sintaxis es valida, 1 si no, con linea y columna del fallo.
 * Nota: valida SINTAXIS, no semantica. No comprueba que las funciones de
 * WordPress existan, porque aqui no las hay.
 */
import fs from 'node:fs';
import path from 'node:path';
import PhpParser from 'php-parser';

const archivo = process.argv[2];
if (!archivo) {
  console.error('uso: node tools/validate-php.mjs <archivo.php>');
  process.exit(2);
}

const abs = path.isAbsolute(archivo) ? archivo : path.resolve(process.cwd(), archivo);
if (!fs.existsSync(abs)) {
  console.error(`no existe el archivo: ${abs}`);
  process.exit(2);
}

const codigo = fs.readFileSync(abs, 'utf8');
const motor = new PhpParser({
  parser: { extractDoc: true, suppressErrors: false },
  ast: { withPositions: true },
});

try {
  motor.parseCode(codigo, abs);
  const lineas = codigo.split('\n').length;
  console.log(`SINTAXIS VALIDA: ${path.basename(abs)} (${lineas} lineas, ${codigo.length} bytes)`);
} catch (e) {
  console.error(`ERROR DE SINTAXIS en ${path.basename(abs)}`);
  console.error(`  ${e.message}`);
  if (e.lineNumber) {
    const col = e.columnNumber ? `:${e.columnNumber}` : '';
    console.error(`  linea ${e.lineNumber}${col}`);
    const l = codigo.split('\n')[e.lineNumber - 1];
    if (l !== undefined) console.error(`  > ${l.trim().slice(0, 120)}`);
  }
  process.exit(1);
}
