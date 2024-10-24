// AutoComplete.tsx
import React, { ChangeEvent, KeyboardEvent } from 'react';
import styles from '../Styles/AutoComplete.module.css';
import { MdClose } from 'react-icons/md';
import IAutoCompleteOptionWrapper from '../Data/IAutoCompleteOptionWrapper';
import SimpleThrottler from '../SimpleThrottler';
import ReactDOM from 'react-dom';

interface AutoCompleteProps<TOption extends object> {
  options: TOption[];
  onSelect: (selected?: TOption) => void;
  labelResolver: (option: TOption) => string;
  onNew?: (label: string) => void;
  onSearch?: (searchText: string) => void | Promise<void>;
  minSearchChars?: number;
  selectedOption?: TOption;
  disabled?: boolean;
  uniqueId?: string;
  onDropdownOpen?: () => void;
  onDropdownClose?: () => void;
  placeholder?: string;
  newItemPrompt?: string;
  throttleDelay?: number;
}

interface AutoCompleteState<TOption extends object> {
  inputValue: string;
  filteredOptions: IAutoCompleteOptionWrapper<TOption>[];
  selectedIndex: number;
  selectedOption?: IAutoCompleteOptionWrapper<TOption>;
  showDropdownAbove?: boolean;
}

class AutoComplete<TOption extends object> extends React.Component<
  AutoCompleteProps<TOption>,
  AutoCompleteState<TOption>
> {
  private inputRef: HTMLInputElement | null = null;
  private dropdownRef: HTMLUListElement | null = null;
  private simpleThrottler = new SimpleThrottler(this.props.throttleDelay ?? 750);

  constructor(props: AutoCompleteProps<TOption>) {
    super(props);
    this.state = {
      inputValue: '',
      filteredOptions: [],
      selectedIndex: -1,
    };
  }

  private get canAddNew(): boolean {
    return this.props.onNew ? true : false;
  }

  componentDidUpdate(prevProps: Readonly<AutoCompleteProps<TOption>>): void {
    if (prevProps.selectedOption !== this.props.selectedOption) {
      this.handleSelect({
        option: this.props.selectedOption as TOption,
      } as IAutoCompleteOptionWrapper<TOption>);
    }

    if (prevProps.options !== this.props.options && this.state.inputValue) {
      this.filterOptions(this.state.inputValue);
    }
  }

  componentDidMount() {
    document.addEventListener('click', this.handleDocumentClick);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  handleDocumentClick = (event: MouseEvent) => {
    const { target } = event;

    // Check if the click is outside the autocomplete component
    if (
      target instanceof Node &&
      this.inputRef &&
      this.dropdownRef &&
      !this.inputRef.contains(target) &&
      !this.dropdownRef.contains(target)
    ) {
      this.closeDropdown();
    }
  };

  handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (this.props.onSearch) {
      await this.handleDebouncedSearchAsync(inputValue);
    }
    this.filterOptions(inputValue);
  };

  clearAndClose = () => {
    this.setState(
      {
        inputValue: '',
        selectedOption: undefined,
      },
      () => {
        this.closeDropdown();
        this.props.onSelect(undefined);
      },
    );
  };

  private setOptionLabel = (
    optionWrapper: IAutoCompleteOptionWrapper<TOption>,
    metadata?: { label?: string; isNew?: boolean },
  ) => {
    const newItemPrompt = this.props.newItemPrompt ?? 'Create';
    const label =
      !optionWrapper || !optionWrapper.option ? '' : metadata?.label ?? this.props.labelResolver(optionWrapper.option);
    optionWrapper.actualLabel = label;
    optionWrapper.displayedLabel = metadata?.isNew === true ? `${newItemPrompt} "${label}"` : label;
    optionWrapper.isNew = metadata?.isNew === true ? true : false;
  };

  private getOptionLabel = (optionWrapper: IAutoCompleteOptionWrapper<TOption>) => {
    return optionWrapper.displayedLabel ?? optionWrapper.actualLabel;
  };

  provideCreateOption = (inputValue: string) => {
    if (!this.canAddNew) return;
    const hasInputValue = inputValue ? true : false;
    if (hasInputValue) {
      const newOption = {} as TOption;
      const newOptionWrapper = {
        option: newOption,
      } as IAutoCompleteOptionWrapper<TOption>;
      this.setOptionLabel(newOptionWrapper, {
        label: inputValue,
        isNew: true,
      });

      this.setState({ filteredOptions: [newOptionWrapper] });
    } else {
      this.setState({ filteredOptions: [] });
    }
  };

  handleDebouncedSearchAsync = async (inputValue: string) => {
    await this.simpleThrottler.throttle(async () => {
      if (!this.props.onSearch) return;
      if (inputValue.length < (this.props.minSearchChars ?? 3)) return;
      await this.props.onSearch(inputValue);
    });
  };

  filterOptions = (inputValue: string) => {
    this.setState({ inputValue, selectedIndex: -1 });

    const arrayToFilter =
      this.props.options && Array.isArray(this.props.options) && this.props.options.length > 0
        ? this.props.options
        : [];

    // Perform filtering based on user input
    const filtered = arrayToFilter
      .filter((option) => this.props.labelResolver(option).toLowerCase().includes(inputValue.toLowerCase()))
      .map((option) => {
        const optionWrapper = {
          option,
        } as IAutoCompleteOptionWrapper<TOption>;
        this.setOptionLabel(optionWrapper);
        return optionWrapper;
      });

    if (filtered.length === 0) {
      this.provideCreateOption(inputValue);
    } else {
      this.setState({ filteredOptions: filtered });
    }
  };

  calculateDropdownPosition = () => {
    if (!this.inputRef || !this.dropdownRef) return;
    const inputRect = this.inputRef.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const dropdownHeight = this.dropdownRef.offsetHeight;

    const spaceBelow = windowHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;

    this.setState({
      showDropdownAbove: spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight,
    });
  };

  handleSelect = (selected: IAutoCompleteOptionWrapper<TOption>) => {
    this.setOptionLabel(selected, {
      isNew: selected.isNew,
      label: selected.actualLabel,
    });
    this.setState(
      {
        inputValue: selected.actualLabel,
        selectedOption: selected,
      },
      () => {
        this.closeDropdown();
      },
    );
    this.props.onSelect(selected.option);
    if (selected.isNew && this.props.onNew) {
      this.props.onNew(selected.actualLabel);
    }
  };

  cancelKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  closeDropdown = () => {
    this.setState(
      {
        filteredOptions: [],
        selectedIndex: -1,
      },
      () => {
        if (this.props.onDropdownClose) {
          this.props.onDropdownClose();
        }
      },
    );
  };

  handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { selectedIndex, filteredOptions } = this.state;

    if (e.key === 'Escape') {
      this.closeDropdown();
    } else if (e.key === 'Tab') {
      this.closeDropdown();
    } else if (e.key === 'Backspace' && this.state.inputValue.length === 0) {
      this.clearAndClose();
    } else if (e.key === 'Enter' && filteredOptions.length > 0) {
      // Handle Enter key press to select the currently highlighted option
      if (selectedIndex < 0) {
        return;
      }
      this.handleSelect(filteredOptions[selectedIndex]);
    } else if (e.key === 'ArrowUp') {
      this.cancelKeyPress(e);
      if (selectedIndex === 0) {
        this.closeDropdown();
      }
      this.setState({
        selectedIndex: Math.max(selectedIndex - 1, 0),
      });
    } else if (e.key === 'ArrowDown' && filteredOptions.length === 0) {
      this.cancelKeyPress(e);
      this.filterOptions(this.state.inputValue);
      this.setState({
        selectedIndex: 0,
      });
    } else if (e.key === 'ArrowDown') {
      this.cancelKeyPress(e);
      this.setState({
        selectedIndex: Math.min(selectedIndex + 1, filteredOptions.length - 1),
      });
    }
  };

  private openDropdown = () => {
    this.filterOptions(this.state.inputValue);
    this.calculateDropdownPosition();
    if (this.props.onDropdownOpen) {
      this.props.onDropdownOpen();
    }
  };

  render() {
    const { inputValue, filteredOptions, selectedIndex, showDropdownAbove } = this.state;
    const dropdown = (
      <ul
        className={`${styles.dropdown} ${showDropdownAbove ? styles.dropdownAbove : ''}`}
        ref={(ref) => (this.dropdownRef = ref)}
      >
        {filteredOptions.map((option, index) => (
          <li
            key={index}
            onClick={() => this.handleSelect(option)}
            className={index === selectedIndex ? styles.selected : ''}
          >
            {this.getOptionLabel(option)}
          </li>
        ))}
      </ul>
    );
    return (
      <div className={styles.container}>
        <div className={styles.inputContainer}>
          <input
            className={styles.input}
            type="text"
            value={inputValue}
            onChange={async (e) => {
              await this.handleInputChange(e);
            }}
            onKeyDown={this.handleKeyDown}
            placeholder={this.props.placeholder ?? 'Type and select'}
            ref={(ref) => (this.inputRef = ref)}
            onFocus={this.openDropdown}
            disabled={this.props.disabled}
          />
          {this.state.selectedOption ? (
            <MdClose
              className={`${styles.icon} ${styles.closeIcon}`}
              onClick={() => {
                this.clearAndClose();
              }}
            />
          ) : null}
        </div>
        {ReactDOM.createPortal(dropdown, document.body)}
      </div>
    );
  }
}

export default AutoComplete;
