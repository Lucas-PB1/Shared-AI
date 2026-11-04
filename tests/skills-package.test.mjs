import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SKILLS = join(import.meta.dirname, '../packages/cursor/skills');
const names = readdirSync(SKILLS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

function markdownFiles(skill) {
  const files = [join(SKILLS, skill, 'SKILL.md')];
  const refs = join(SKILLS, skill, 'references');
  if (existsSync(refs)) {
    for (const f of readdirSync(refs)) if (f.endsWith('.md')) files.push(join(refs, f));
  }
  return files;
}

/** Frases do boilerplate removido — idênticas em dezenas de arquivos, sem valor por skill. */
const BOILERPLATE = [
  'Ler o contexto do pedido e identificar qual referência cobre o caso',
  'Aplicar o padrão mínimo que resolve o problema sem over-engineering',
  'Documentar exceções apenas quando o trade-off não for óbvio',
  'Copiar snippet sem adaptar nomes e contratos ao módulo atual',
  'Combinar com outras skills da mesma categoria',
  'Em dúvida, preferir solução mais simples e iterar depois',
  'Comportamento atual documentado ou coberto por teste antes de mudar',
  'mudança pequena, intenção evidente no diff, fácil de reverter',
  'Quando o mesmo padrão aparecer pela terceira vez (considerar extrair)',
];

describe('pacote de skills', () => {
  it('tem skills', () => assert.ok(names.length > 0));

  for (const name of names) {
    describe(name, () => {
      const skillFile = join(SKILLS, name, 'SKILL.md');
      const text = existsSync(skillFile) ? readFileSync(skillFile, 'utf8') : '';

      it('frontmatter name = pasta e description presente', () => {
        assert.ok(text, 'SKILL.md ausente');
        const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
        assert.match(front, new RegExp(`^name: ${name}$`, 'm'));
        assert.match(front, /^description:/m);
      });

      it('links relativos apontam para arquivos existentes', () => {
        for (const file of markdownFiles(name)) {
          // Ignora exemplos em código inline/blocos (ex.: `[texto](/caminho.md)`).
          const md = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
          for (const [, target] of md.matchAll(/\]\(([^)#\s]+)\)/g)) {
            if (/^[a-z]+:/i.test(target)) continue;
            assert.ok(existsSync(join(dirname(file), target)), `${file}: link quebrado ${target}`);
          }
        }
      });

      it('"Relacionado" só cita skills que existem', () => {
        const related = /## Relacionado\n([\s\S]*?)(?:\n## |$)/.exec(text)?.[1] ?? '';
        for (const [, ref] of related.matchAll(/`([a-z0-9-]+)`/g)) {
          assert.ok(names.includes(ref), `skill inexistente em Relacionado: ${ref}`);
        }
      });

      it('sem boilerplate genérico', () => {
        for (const file of markdownFiles(name)) {
          const md = readFileSync(file, 'utf8');
          for (const phrase of BOILERPLATE) {
            assert.ok(!md.includes(phrase), `${file}: boilerplate "${phrase}"`);
          }
        }
      });
    });
  }
});
