#!/usr/bin/env node

'use strict';

const { execSync } = require('child_process');
const path = require('path');

const BRANCH_NAME = 'solutioning';

function run(command, cwd) {
  return execSync(command, { cwd, stdio: 'pipe' }).toString().trim();
}

function createSolutioningBranch(projectRoot) {
  console.log(`\n🛠️ Phase 3 - Creando rama "${BRANCH_NAME}"...`);

  // Verificar que existe un repositorio git
  try {
    run('git rev-parse --git-dir', projectRoot);
  } catch {
    console.error('❌ No se encontró un repositorio git en:', projectRoot);
    process.exit(1);
  }

  // Verificar si la rama ya existe (local)
  let branchExists = false;
  try {
    const localBranches = run('git branch --list ' + BRANCH_NAME, projectRoot);
    branchExists = localBranches.trim().length > 0;
  } catch {
    branchExists = false;
  }

  if (branchExists) {
    console.log(`✓ La rama "${BRANCH_NAME}" ya existe.`);
    return;
  }

  // Crear la rama
  try {
    run(`git checkout -b ${BRANCH_NAME}`, projectRoot);
    console.log(`✅ Rama "${BRANCH_NAME}" creada correctamente.`);
  } catch (error) {
    console.error(`❌ Error al crear la rama "${BRANCH_NAME}":`, error.message);
    process.exit(1);
  }
}

// Resolver el directorio raíz del proyecto (sube desde este script hasta encontrar .git)
function findProjectRoot() {
  let dir = path.resolve(__dirname);
  for (let i = 0; i < 10; i++) {
    try {
      execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'pipe' });
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

function commitAll(comentario, projectRoot) {
  if (!comentario || comentario.trim().length === 0) {
    console.error('❌ El comentario del commit no puede estar vacío.');
    process.exit(1);
  }

  // Verificar que existe un repositorio git
  try {
    run('git rev-parse --git-dir', projectRoot);
  } catch {
    console.error('❌ No se encontró un repositorio git en:', projectRoot);
    process.exit(1);
  }

  console.log('\n📦 Agregando todos los archivos al stage...');
  try {
    run('git add .', projectRoot);
    console.log('✓ git add . ejecutado correctamente.');
  } catch (error) {
    console.error('❌ Error al ejecutar git add .:', error.message);
    process.exit(1);
  }

  console.log(`\n💾 Creando commit: "${comentario}"...`);
  try {
    run(`git commit -m "${comentario.replace(/"/g, '\\"')}"`, projectRoot);
    console.log('✅ Commit creado correctamente.');
  } catch (error) {
    console.error('❌ Error al crear el commit:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  const projectRoot = findProjectRoot();
  const args = process.argv.slice(2);
  const commitIdx = args.indexOf('--commit');
  if (commitIdx !== -1) {
    const message = args[commitIdx + 1];
    commitAll(message, projectRoot);
  } else {
    createSolutioningBranch(projectRoot);
  }
}

module.exports = { createSolutioningBranch, commitAll };
