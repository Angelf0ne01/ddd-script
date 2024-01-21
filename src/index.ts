import { Command } from "commander";
import inquirer from "inquirer";
import path from "node:path";
import ejs from "ejs";
import fs from "fs";
import fsExtra from "fs-extra";
import _ from "lodash";

const program = new Command();

interface Menu {
  moduleName: string;
  useCases: string[];
  controllers: string[];
  infrastructure: string[];
}

program
  .name("DDD Create Script")
  .description("DDD Script")
  .version("1.0.0")
  .action(() => {
    inquirer
      .prompt([
        {
          type: "input",
          name: "moduleName",
          message: "Paso 1: Ingreso el nombre del modulo",
        },
        {
          type: "checkbox",
          name: "useCases",
          message: "Paso 2: Selecciona los casos de uso a utilizar",
          choices: ["create", "delete", "find-one", "find-all", "update"],
        },
        {
          type: "checkbox",
          name: "controllers",
          message: "Paso 3: Selecciona controladores a utilizar",
          choices: ["http", "graphql"],
        },
        {
          type: "checkbox",
          name: "infrastructure",
          message: "Paso 4: Selecciona la infraestructura",
          choices: ["mongo", "typeorm"],
        },
      ])
      .then((answers) => main(answers))
      .catch((error) => console.error(error));
  });

program.parse();

function transformText(input: string) {
  const snakeCase = input
    .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    .replace(/^-/, ""); // Elimina el guion inicial si lo hay

  const snakeLowerCase = input
    .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
    .replace(/^-/, ""); //

  const upperSnakeCase = input
    .replace(/^[A-Z]/, (match) => match.toLowerCase()) // Convierte la primera letra a minúscula
    .replace(/[A-Z]/g, (match) => `_${match}`)
    .toUpperCase();

  const upperCamelCase = input
    .replace(/^[a-z]/, (match) => match.toUpperCase()) // Convierte la primera letra a mayúscula
    .replace(/_[a-z]/g, (match) => match[1].toUpperCase()) // Convierte las letras después de guiones bajos a mayúsculas
    .replace(/_/g, ""); // Elimina guiones bajos

  return {
    snakeCase,
    snakeLowerCase,
    camelCase: input,
    upperSnakeCase,
    upperCamelCase,
  };
}

function getSingularAndPlural(word: string): {
  singular: string;
  plural: string;
} {
  // Algunas reglas generales para convertir plurales a singulares
  const rules: [RegExp, string][] = [
    [/^(s|x|z|sh|ch)es$/, "$1"],
    [/ies$/, "y"],
    [/s$/, ""],
  ];

  let singular = word;
  let plural = word;

  for (const [pattern, replacement] of rules) {
    if (pattern.test(word)) {
      singular = word.replace(pattern, replacement);
      break;
    }
  }

  plural = `${singular}s`;

  return { singular, plural };
}

async function getFilesRecursively(directory: string): Promise<string[]> {
  const files: string[] = [];

  async function readDirectory(dir: string): Promise<void> {
    const entries = fs.readdirSync(dir);

    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(dir, entry);
        const stat = fs.statSync(entryPath);

        if (stat.isDirectory()) {
          await readDirectory(entryPath); // Llamada recursiva si es un directorio
        } else {
          files.push(entryPath); // Agrega la ruta del archivo a la lista
        }
      })
    );
  }

  await readDirectory(directory); // Inicia el proceso de lectura recursiva

  return files;
}

async function getTemplate(): Promise<string[]> {
  const currentModuleDirectory = path.dirname(
    new URL(import.meta.url).pathname
  );
  const templatesPath = path.join(currentModuleDirectory, "templates");
  return await getFilesRecursively(templatesPath);
}

function filterTemplatse(
  projectType: string,
  paths: string[],
  cases: string[]
): string[] {
  let filterPath: string[] = [];

  const pathFilters = paths.filter((path) => path.includes(projectType));

  for (const useCase of pathFilters) {
    for (const path of paths) {
      if (path.includes(useCase)) {
        filterPath.push(path);
      }
    }
  }
  return filterPath;
}

interface Template {
  path: string;
  content: string;
}

function createTemplate(
  templatesPaths: string[],
  modelNameSnakeCase: string,
  modelNameUpperCamelCase: string,
  modelNameUpperSnakeCase: string,
  modelNameCamelCase: string,
  modelNameSnakeLowerCase: string
): Template[] {
  let templates: Template[] = [];
  for (const templatePath of templatesPaths) {
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    const renderedContent = ejs.render(templateContent, {
      modelNameSnakeCase,
      modelNameUpperCamelCase,
      modelNameUpperSnakeCase,
      modelNameCamelCase,
      modelNameSnakeLowerCase,
    });
    templates.push({
      content: renderedContent,
      path: templatePath,
    });
  }
  return templates;
}

function getOutputPath(inputPath: string, moduleName: string) {
  const currentPath = path.dirname(new URL(import.meta.url).pathname);
  const outputPath = inputPath
    .replace(currentPath + "/templates", "")
    .replaceAll("module", moduleName)
    .replace("ejs", "ts");
  return "./" + outputPath;
}

async function main(menu: Menu) {
  const { moduleName, useCases, controllers, infrastructure } = menu;
  const { singular, plural } = getSingularAndPlural(moduleName);
  const singularModule = singular;
  const pluralModule = plural;

  const {
    snakeCase,
    upperSnakeCase,
    upperCamelCase,
    camelCase,
    snakeLowerCase,
  } = transformText(singularModule);

  //obtengo los templates
  const templates = await getTemplate();
  //filtros
  const filterTemplatesController = filterTemplatse(
    "api",
    templates,
    controllers
  );
  const filterTemplatesBoundendContext = filterTemplatse(
    "shared",
    templates,
    useCases
  );
  console.log;
  const templateApi = createTemplate(
    filterTemplatesController,
    snakeCase,
    upperCamelCase,
    upperSnakeCase,
    camelCase,
    snakeLowerCase
  );
  const templateShared = createTemplate(
    filterTemplatesBoundendContext,
    snakeCase,
    upperCamelCase,
    upperSnakeCase,
    camelCase,
    snakeLowerCase
  );

  [...templateApi, ...templateShared].map((template) => {
    const outputPath = getOutputPath(template.path, snakeCase);
    fsExtra.ensureDirSync(path.dirname(outputPath));
    fsExtra.writeFileSync(outputPath, template.content);
  });
}
