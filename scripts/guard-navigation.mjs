import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const navigationSources = [
  {
    file: "src/components/admin-auth.js",
    arrays: ["ADMIN_NAV_ITEMS"],
    labelFields: ["label"],
  },
  {
    file: "src/components/overview-shell.js",
    arrays: ["navItems", "businessMenuItems"],
    labelFields: ["labelKey"],
  },
  {
    file: "src/components/settings-shell.js",
    arrays: ["settingsNavItems"],
    labelFields: ["label", "labelKey"],
  },
];

const sectionTabFile = "src/components/settings-shell.js";
const sectionTabNames = ["preference", "security", "business", "notifications", "api"];

const extractArray = (source, name) => {
  const startToken = `${name} = [`;
  const start = source.indexOf(startToken);
  if (start === -1) {
    return "";
  }

  const bodyStart = source.indexOf("[", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) {
      return source.slice(bodyStart, index + 1);
    }
  }

  return "";
};

const extractSectionTabArray = (source, name) => {
  const startToken = `${name}: [`;
  const start = source.indexOf(startToken);
  if (start === -1) {
    return "";
  }

  const bodyStart = source.indexOf("[", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (depth === 0) {
      return source.slice(bodyStart, index + 1);
    }
  }

  return "";
};

const extractObjects = (arraySource) => {
  const objects = [];
  let depth = 0;
  let objectStart = -1;

  for (let index = 0; index < arraySource.length; index += 1) {
    const char = arraySource[index];
    if (char === "{") {
      if (depth === 0) objectStart = index;
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && objectStart !== -1) {
        objects.push(arraySource.slice(objectStart, index + 1));
        objectStart = -1;
      }
    }
  }

  return objects;
};

const getStringProperty = (objectSource, property) => {
  const match = objectSource.match(new RegExp(`${property}\\s*:\\s*["']([^"']+)["']`));
  return match?.[1] || "";
};

const validateItems = ({ arrayName, file, items, labelFields }) => {
  const failures = [];

  if (items.length === 0) {
    failures.push(`${file}:${arrayName} has no items or could not be parsed`);
    return failures;
  }

  items.forEach((item, index) => {
    const href = getStringProperty(item, "href");
    const label = labelFields.map((field) => getStringProperty(item, field)).find(Boolean);

    if (!href) {
      failures.push(`${file}:${arrayName}[${index}] is missing href`);
    } else if (!href.startsWith("/")) {
      failures.push(`${file}:${arrayName}[${index}] href must start with / (${href})`);
    }

    if (!label) {
      failures.push(`${file}:${arrayName}[${index}] is missing ${labelFields.join(" or ")}`);
    }
  });

  return failures;
};

const failures = [];

for (const config of navigationSources) {
  const source = readFileSync(resolve(rootDir, config.file), "utf8");
  for (const arrayName of config.arrays) {
    const arraySource = extractArray(source, arrayName);
    const items = extractObjects(arraySource);
    failures.push(...validateItems({ arrayName, file: config.file, items, labelFields: config.labelFields }));
  }
}

const sectionSource = readFileSync(resolve(rootDir, sectionTabFile), "utf8");
for (const sectionName of sectionTabNames) {
  const arraySource = extractSectionTabArray(sectionSource, sectionName);
  const items = extractObjects(arraySource);
  failures.push(
    ...validateItems({
      arrayName: `sectionTabs.${sectionName}`,
      file: sectionTabFile,
      items,
      labelFields: ["label", "labelKey"],
    })
  );
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  console.error(`Navigation guard failed for ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("Navigation guard passed.");
