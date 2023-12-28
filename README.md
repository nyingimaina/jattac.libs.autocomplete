# AutoComplete Component

**AutoComplete** is a React component that provides an interactive autocomplete feature for selecting options from a list. It supports custom rendering of options, searching for options, and adding new options on the fly.

## Installation

```bash
npm install jattac.libs.autocomplete
```

## Example

```js
import React from 'react';
import AutoComplete from 'jattac.libs.autocomplete/auto-complete';

const MyComponent = () => {
  // Define your options and necessary callbacks
  const options = [...]; // Array of options (can be strings or objects)
  const onSelect = (selectedOption) => {
    // Handle selected option
  };
  const labelResolver = (option) => {
    // Resolve and return the label for the option
  };

  return (
    <AutoComplete
      options={options}
      onSelect={onSelect}
      labelResolver={labelResolver}
      // Add other optional props as needed
    />
  );
};

export default MyComponent;

```

## Props

- **options:** Array of options to display in the autocomplete dropdown.
- **onSelect:** Callback function triggered when an option is selected.
- **labelResolver:** Function to resolve and return the label for each option.
- **onNew:** Optional. Callback function triggered when a new option is created.
- **onSearch:** Optional. Callback function triggered when searching for options.
- **minSearchChars:** Optional. Minimum number of characters required to trigger a search.
- **selectedOption:** Optional. Currently selected option.
- **disabled:** Optional. Disables the autocomplete input.
- **uniqueId:** Optional. Unique identifier for the autocomplete component.
- **onDropdownOpen:** Optional. Callback function triggered when the dropdown opens.
- **onDropdownClose:** Optional. Callback function triggered when the dropdown closes.

## License

This component is licensed under the MIT License - see the LICENSE.md file for details.
