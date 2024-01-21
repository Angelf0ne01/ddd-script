import { Command } from "commander";
import inquirer from "inquirer";
import path from "path";
import ejs from "ejs";
import fs from "fs";
import _ from "lodash";

const program = new Command();

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
      .then((answers) => console.log(answers))
      .catch((error) => console.error(error));
  });

program.parse();
