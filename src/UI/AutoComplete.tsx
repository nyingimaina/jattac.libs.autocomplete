import React, { Component, ChangeEvent, KeyboardEvent } from 'react';
import ReactDOM from 'react-dom';
import styles from '../Styles/AutoComplete.module.css';
import { MdClose } from 'react-icons/md';
import IAutoCompleteOptionWrapper from '../Data/IAutoCompleteOptionWrapper';
import SimpleThrottler from '../SimpleThrottler';

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

class AutoComplete<TOption extends object> extends Component<AutoCompleteProps<TOption>, AutoCompleteState<TOption>> {
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

  componentDidMount() {
    document.addEventListener('click', this.handleDocumentClick);
    window.addEventListener('resize', this.updateDropdownPosition);
    window.addEventListener('scroll', this.updateDropdownPosition, true);
  }

  componentDidUpdate(prevProps: AutoCompleteProps<TOption>) {
    if (prevProps.selectedOption !== this.props.selectedOption) {
      this.handleSelect({
        option: this.props.selectedOption as TOption,
      } as IAutoCompleteOptionWrapper<TOption>);
    }
    if (prevProps.options !== this.props.options && this.state.inputValue) {
      this.filterOptions(this.state.inputValue);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleDocumentClick);
    window.removeEventListener('resize', this.updateDropdownPosition);
    window.removeEventListener('scroll', this.updateDropdownPosition, true);
  }

  handleDocumentClick = (event: MouseEvent) => {
    if (
      event.target instanceof Node &&
      this.inputRef &&
      this.dropdownRef &&
      !this.inputRef.contains(event.target) &&
      !this.dropdownRef.contains(event.target)
    ) {
      this.closeDropdown();
    }
  };

  updateDropdownPosition = () => {
    if (!this.inputRef || !this.dropdownRef) return;

    const inputRect = this.inputRef.getBoundingClientRect();
    const dropdownHeight = this.dropdownRef.offsetHeight;
    const spaceBelow = window.innerHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;

    this.dropdownRef.style.minWidth = `${inputRect.width}px`;

    this.setState({
      showDropdownAbove: spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight,
    });

    if (this.dropdownRef) {
      this.dropdownRef.style.position = 'absolute';
      this.dropdownRef.style.left = `${inputRect.left + window.scrollX}px`;
      this.dropdownRef.style.top = this.state.showDropdownAbove
        ? `${inputRect.top + window.scrollY - dropdownHeight}px`
        : `${inputRect.bottom + window.scrollY}px`;
    }
  };

  handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (this.props.onSearch) {
      await this.handleDebouncedSearchAsync(inputValue);
    }
    this.filterOptions(inputValue);
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

    const filtered = this.props.options
      .filter((option) => this.props.labelResolver(option).toLowerCase().includes(inputValue.toLowerCase()))
      .map(
        (option) =>
          ({
            option,
            displayedLabel: this.props.labelResolver(option),
          }) as IAutoCompleteOptionWrapper<TOption>,
      );

    this.setState({ filteredOptions: filtered }, this.updateDropdownPosition);
  };

  handleSelect = (selected: IAutoCompleteOptionWrapper<TOption>) => {
    this.setState(
      {
        inputValue: selected.displayedLabel,
        selectedOption: selected,
        filteredOptions: [],
      },
      () => {
        this.props.onSelect(selected.option);
        if (selected.isNew && this.props.onNew) this.props.onNew(selected.displayedLabel);
      },
    );
  };

  clearAndClose = () => {
    this.setState(
      {
        inputValue: '',
        selectedOption: undefined,
        filteredOptions: [],
      },
      this.closeDropdown,
    );
    this.props.onSelect(undefined);
  };

  closeDropdown = () => {
    this.setState(
      { filteredOptions: [], selectedIndex: -1 },
      () => this.props.onDropdownClose && this.props.onDropdownClose(),
    );
  };

  openDropdown = () => {
    this.filterOptions(this.state.inputValue);
    this.updateDropdownPosition();
    this.props.onDropdownOpen && this.props.onDropdownOpen();
  };

  renderDropdown() {
    return (
      <ul
        className={`${styles.dropdown} ${this.state.showDropdownAbove ? styles.dropdownAbove : ''}`}
        ref={(ref) => (this.dropdownRef = ref)}
      >
        {this.state.filteredOptions.map((option, index) => (
          <li
            key={index}
            className={index === this.state.selectedIndex ? styles.selected : ''}
            onClick={() => this.handleSelect(option)}
          >
            {option.displayedLabel}
          </li>
        ))}
      </ul>
    );
  }

  handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { selectedIndex, filteredOptions } = this.state;

    switch (e.key) {
      case 'ArrowDown':
        if (filteredOptions.length > 0) {
          e.preventDefault();
          if (selectedIndex < 0) {
            this.setState({ selectedIndex: 0 }); // Move to first item
          } else {
            this.setState({
              selectedIndex: (selectedIndex + 1) % filteredOptions.length,
            });
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (filteredOptions.length > 0 && selectedIndex >= 0) {
          this.setState({
            selectedIndex: selectedIndex > 0 ? selectedIndex - 1 : filteredOptions.length - 1,
          });
        }
        break;

      case 'Enter':
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          this.handleSelect(filteredOptions[selectedIndex]);
        }
        break;

      case 'Escape':
        this.closeDropdown();
        break;
    }
  };

  render() {
    return (
      <div className={styles.container}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            className={styles.input}
            ref={(ref) => (this.inputRef = ref)}
            value={this.state.inputValue}
            onChange={this.handleInputChange}
            onFocus={this.openDropdown}
            onKeyDown={this.handleKeyDown} // Attach handleKeyDown here
            placeholder={this.props.placeholder ?? 'Type and select'}
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
        {ReactDOM.createPortal(this.renderDropdown(), document.body)}
      </div>
    );
  }
}

export default AutoComplete;
