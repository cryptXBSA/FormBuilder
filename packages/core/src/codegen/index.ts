import type { FormFramework, FormSchema } from "@/types";
import Handlebars from "handlebars";
import { generateImports } from "./imports/generateImports";
import { formToZodSchema } from "./utils";
import * as prettier from "prettier/standalone";
import * as parserTypeScript from "prettier/parser-typescript";
import * as prettierPluginEstree from "prettier/plugins/estree";
import { COMPONENTS } from "../components/components";
import { mainNextTemplate } from "./templates/next/main";
import { mainVueTemplate } from "./templates/vue/main";
import { mainSvelteTemplate } from "./templates/svelte/main";

Handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
	//@ts-ignore
	return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});
Handlebars.registerHelper("ifNotEquals", function (arg1, arg2, options) {
	//@ts-ignore
	return arg1 !== arg2 ? options.fn(this) : options.inverse(this);
});

// Handlebars.registerHelper("eq", function (arg1, arg2, options) {
// 	//@ts-ignore
// 	return arg1 === arg2 ? options.fn(this) : options.inverse(this);
// });

// TODO: fix default values
Handlebars.registerHelper("defaultValues", (fields) => {
	let output = "{\n";
	for (const field of fields) {
		if (field.kind === "string") {
			output += `${field.key}: "${field.defaultValue || ""}",\n`;
		} else if (field.kind === "number") {
			output += `${field.key}: ${field.defaultValue || 1},\n`;
		}
	}
	output += "}";
	return new Handlebars.SafeString(output);
});

// biome-ignore lint/complexity/useArrowFunction: <explanation>
Handlebars.registerHelper("lookupComponent", function (field) {
	const componentKey = `${field.variant}`;

	if (!COMPONENTS[componentKey]) {
		console.warn(`No component found for: ${componentKey}`);
		return "";
	}

	let templateText = COMPONENTS[componentKey].template;
	const entities: Record<string, string> = {
		"&#96;": "`",
		"&#36;": "$",
		"&quot;": '"',
		"&apos;": "'",
		"&lt;": "<",
		"&gt;": ">",
		"&amp;": "&",
	};

	templateText = templateText.replace(
		/(&[#\w]+;)/g,
		(entity) => entities[entity] || entity,
	);

	const template = Handlebars.compile(templateText);
	return new Handlebars.SafeString(template(field));
});



export async function generateCode(framework: FormFramework, form: FormSchema) {
	const zodFormSchema = formToZodSchema(form);
	const formSchema = `const formSchema = toTypedSchema(${zodFormSchema})`;

	const main = Handlebars.compile(framework === 'vue' ? mainVueTemplate : (framework === 'svelte' ? mainSvelteTemplate : mainNextTemplate));
	// TODO: maybe flat is wrong? because of the nested fields and the way they should rendered (flex)
	const flattedFields = form.fields.flat();
	const formTemplateCode = main({ ...form, fields: flattedFields });

	const importsTemplate = Handlebars.compile(generateImports(framework, form.fields));

	const importsCode = importsTemplate({
		importAliasUtils: form.settings.importAliasUtils,
		importAliasComponents: form.settings.importAliasComponents,
	});

	const formattedImports = await formatCode(importsCode);
	const formattedFormSchema = await formatCode(formSchema);
	const completeCode = formattedImports + formattedFormSchema + formTemplateCode;

	// couldn't find a vue parser 
	if (framework === 'vue') {
		return `<script setup lang="ts">\n${completeCode}`;
	}

	const formattedCode = await formatCode(completeCode);
	return formattedCode;
}

async function formatCode(code: string) {
	return await prettier.format(code, {
		parser: "typescript",
		semi: true,
		singleQuote: false,
		tabWidth: 2,
		plugins: [parserTypeScript, prettierPluginEstree],
	});
}