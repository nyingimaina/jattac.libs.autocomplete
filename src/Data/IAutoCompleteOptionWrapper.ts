export default interface IAutoCompleteOptionWrapper<TOption> {
  option: TOption;
  actualLabel: string;
  isNew: boolean;
  displayedLabel: string;
}
