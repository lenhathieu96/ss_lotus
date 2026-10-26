import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(process.cwd(), 'src');

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = resolve(directory, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  });
}

describe('application architecture boundaries', () => {
  it('keeps only local and network infrastructure at the data root', () => {
    const directories = readdirSync(resolve(sourceRoot, 'data'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    expect(directories).toEqual(['local', 'network']);
  });

  it('keeps App Router files limited to route and layout glue', () => {
    const violations: string[] = [];
    for (const name of files(resolve(sourceRoot, 'app'))) {
      const label = relative(sourceRoot, name);
      if (!/\/(page|layout)\.tsx$/.test(name)) {
        violations.push(`${label}: application implementation outside feature`);
        continue;
      }
      const source = ts.createSourceFile(name, readFileSync(name, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node): void => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const target = node.moduleSpecifier.text;
          const feature = target.startsWith('@features/') || target.includes('/features/');
          if (!feature && target !== 'next' && target !== 'next/navigation') violations.push(`${label}: non-feature import ${target}`);
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(source);
          if (!/^[A-Z][A-Za-z0-9]*$/.test(tag)) violations.push(`${label}: screen markup ${tag}`);
          const nested = ts.isJsxOpeningElement(node) && ts.isJsxElement(node.parent) && node.parent.children.some((child) => !ts.isJsxText(child) || child.text.trim());
          if (nested) violations.push(`${label}: nested screen composition`);
        }
        if (ts.isJsxFragment(node)) violations.push(`${label}: screen fragment`);
        if (ts.isCallExpression(node) && node.expression.getText(source) !== 'redirect') violations.push(`${label}: non-routing function call`);
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(violations).toEqual([]);
  });

  it('keeps retired API and privileged providers out of frontend source', () => {
    const violations: string[] = [];
    for (const name of files(sourceRoot).filter((name) => /\.[jt]sx?$/.test(name) && !/\.test\.[jt]sx?$/.test(name))) {
      const contents = readFileSync(name, 'utf8');
      for (const marker of ['@/', '/api/library', '@data/remote', '@data/auth', '@data/library', '@aws-sdk/', 'SUPABASE_SERVICE_ROLE_KEY']) {
        if (contents.includes(marker)) violations.push(`${relative(sourceRoot, name)}: ${marker}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps feature logic in one root module instead of retired layer folders', () => {
    const featureRoot = resolve(sourceRoot, 'features');
    const violations = files(featureRoot)
      .filter((name) => /\/(domain|repositories|services)\//.test(relative(featureRoot, name)))
      .map((name) => relative(sourceRoot, name));
    expect(violations).toEqual([]);
  });

  it('keeps each consolidated feature to its agreed root production and test modules', () => {
    const expected = new Map([
      ['auth', ['auth-repository.ts', 'auth-repository.test.ts', 'server-auth-bootstrap.ts', 'server-auth-bootstrap.test.ts']],
      ['calendar', ['lunar-date-domain.ts', 'lunar-date-domain.test.ts']],
      ['households', ['household-repository.ts', 'household-repository.test.ts']],
      ['prayer', ['prayer-repository.ts', 'prayer-repository.test.ts']],
      ['deceased-persons', ['deceased-person-repository.ts', 'deceased-person-repository.test.ts']],
      ['library', ['library-repository.ts', 'library-repository.test.ts']],
    ]);
    const violations: string[] = [];
    for (const [feature, filesAtRoot] of expected) {
      const actual = readdirSync(resolve(sourceRoot, 'features', feature), { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.[jt]sx?$/.test(entry.name))
        .map((entry) => entry.name)
        .sort();
      if (actual.join('|') !== [...filesAtRoot].sort().join('|')) {
        violations.push(`${feature}: ${actual.join(', ') || 'no root modules'}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('uses relative imports within a feature', () => {
    const featureRoot = resolve(sourceRoot, 'features');
    const violations: string[] = [];
    for (const name of files(featureRoot).filter((file) => /\.[jt]sx?$/.test(file))) {
      const feature = relative(featureRoot, name).split('/')[0];
      const featureDirectory = resolve(featureRoot, feature);
      const selfAlias = `@features/${feature}/`;
      const source = ts.createSourceFile(name, readFileSync(name, 'utf8'), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node): void => {
        const specifier = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])
          ? node.arguments[0].text
          : null;
        if (specifier?.startsWith(selfAlias)) {
          violations.push(`${relative(sourceRoot, name)}: self feature alias ${selfAlias}`);
        }
        if (specifier?.startsWith('.') && relative(featureDirectory, resolve(dirname(name), specifier)).startsWith('..')) {
          violations.push(`${relative(sourceRoot, name)}: relative import escapes ${feature}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(violations).toEqual([]);
  });
});
