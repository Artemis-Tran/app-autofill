# App Autofill Extension

This is a browser extension that automatically fills out web forms based on a JSON profile you provide. It's designed to be a simple, powerful, and highly customizable tool for developers, testers, and anyone who frequently fills out online forms.

## Features

- **Autofill from JSON**: Define your form data in a simple JSON format.
- **Customizable Aliases**: Easily map your JSON data to form fields with a flexible aliasing system.
- **Shadow DOM Support**: Fills forms even within encapsulated web components.
- **Single-Page Application (SPA) Support**: Automatically detects and fills forms that are loaded dynamically.
- **Demographic Data Control**: Choose whether to fill fields categorized as "demographics."

## Installation

1.  Clone this repository to your local machine.
2.  From the root, run `npm run build` to build the extension.
3.  Open your browser's extension management page (e.g., `chrome://extensions` in Google Chrome).
4.  Enable "Developer mode."
5.  Click "Load unpacked" and select the `dist` directory from this project.

## How to Use

1.  Click on the extension's icon in your browser toolbar to open the popup.
2.  Paste your JSON profile into the text area. See the [JSON Profile](#json-profile) section for an example.
3.  Click "Save" to store your profile.
4.  Navigate to a web page with a form you want to fill.
5.  Click the "Fill" button in the extension popup.
6.  The extension will highlight the fields it has filled. Review the highlighted fields to ensure they are correct.

## JSON Profile

The extension uses a JSON object to store your autofill data. The keys of the object can be nested to create a structured profile. Here is an example:

```json
{
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com"
  },
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zip": "12345"
  },
  "demographics": {
    "gender": "Male"
  }
}
```

## Project Structure

-   `src/`: The root directory for the extension's source code.
    -   `manifest.json`: The extension's manifest file, which defines its permissions and components.
    -   `popup/`: Contains the HTML, CSS, and TypeScript for the extension's popup.
    -   `content.ts`: The content script that is injected into web pages to fill forms.
    -   `background.ts`: The background script for the extension.
    -   `storage.ts`: Handles saving and loading the user's profile from browser storage.
    -   `aliases.ts`: Defines the regular expressions used to match form fields to the JSON profile keys.
    -   `types.ts`: Contains TypeScript type definitions.

## Customization

You can customize the field matching logic by editing the `src/aliases.ts` file. This file contains a dictionary of regular expressions that map field names, labels, and other attributes to the keys in your JSON profile.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
