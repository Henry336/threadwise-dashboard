import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const NATIVE_DIALOG = "Use the branded useConfirmation() dialog instead of the browser's native dialog.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Threadwise UI rules, enforced on every file instead of hand-picked source-text tests.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", { name: "confirm", message: NATIVE_DIALOG }, { name: "alert", message: NATIVE_DIALOG }],
      "no-restricted-properties": ["error",
        { object: "window", property: "confirm", message: NATIVE_DIALOG },
        { object: "window", property: "alert", message: NATIVE_DIALOG },
      ],
      "no-restricted-syntax": ["error",
        { selector: "JSXOpeningElement[name.name='select']", message: "Use StudyChoicePicker or StudyFormChoicePicker instead of a native <select>." },
        { selector: "AssignmentExpression > MemberExpression.left[property.name='overflow'][object.property.name='style']", message: "Lock page scroll with useModal or body-scroll-lock.ts so stacked modals cannot freeze scrolling." },
      ],
    },
  },
  // The reference-counted lock is the one place allowed to write body overflow.
  { files: ["src/lib/body-scroll-lock.ts"], rules: { "no-restricted-syntax": "off" } },
  // Keep the Study shell and Deep Work split (2026-08-31 extraction) from growing back together.
  { files: ["src/components/study-dashboard.tsx"], rules: { "max-lines": ["error", { max: 1000, skipBlankLines: false, skipComments: false }] } },
  { files: ["src/components/study-deep-work.tsx"], rules: { "max-lines": ["error", { max: 500, skipBlankLines: false, skipComments: false }] } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
