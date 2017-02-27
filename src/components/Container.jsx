import React, { PropTypes, Component } from 'react';
import { displayRowControls, getGroupedControls } from 'src/helpers/controlsParser';
import isEmpty from 'lodash/isEmpty';
import filter from 'lodash/filter';
import { controlStateFactory, getErrors } from 'src/ControlState';
import ControlRecordTreeBuilder from 'src/helpers/ControlRecordTreeBuilder';
import addMoreDecorator from './AddMoreDecorator';

export class Container extends addMoreDecorator(Component) {
  constructor(props) {
    super(props);
    this.childControls = {};
    const { observations, metadata } = this.props;
    const controlRecordTree = new ControlRecordTreeBuilder().build(metadata, observations);
    this.state = { errors: [], data: controlRecordTree, collapse: props.collapse };
    this.storeChildRef = this.storeChildRef.bind(this);
    this.onValueChanged = this.onValueChanged.bind(this);
    this.onControlAdd = this.onControlAdd.bind(this);
    this.onControlRemove = this.onControlRemove.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ collapse: nextProps.collapse });
  }

  onValueChanged(obs, errors) {
    const data = this._changeValue(obs, errors);
    this.setState({ data, collapse: undefined });
  }

  onControlAdd(obs) {
    const nextFormFieldPath = this.state.data.generateFormFieldPath(obs.formFieldPath);
    const nextGroupMembers = this.updateGroupMembers(obs.groupMembers, nextFormFieldPath);
    const obsUpdated = obs.cloneForAddMore(nextFormFieldPath, nextGroupMembers);
    const clonedRecord = this.state.data
      .getRecord(obs.formFieldPath)
      .set('formFieldPath', nextFormFieldPath)
      .set('obs', obsUpdated);
    const data = this.state.data.setRecord(clonedRecord);
    const updatedState = data.prepareRecordsForAddMore(obs.formFieldPath);

    this.setState({ data: updatedState.data });
  }

  onControlRemove(obs) {
    const data = this._changeValue(obs, []).deleteRecord(obs);
    const updatedState = data.prepareRecordsForAddMore(obs.formFieldPath);
    this.setState({ data: updatedState.data });
  }

  getValue() {
    const records = this.state.data.getRecords();
    const observations = this._getObservations(records.map((record) => record.getObject()));
    const errors = getErrors(records);
    if (isEmpty(observations) || this.areAllVoided(observations) || isEmpty(errors)) {
      return { observations };
    }

    return { errors, observations };
  }

  /* eslint-disable no-param-reassign */
  _getObservations(observations) {
    return filter([].concat(...observations), (obs) => {
      if (!isEmpty(obs.groupMembers)) {
        obs.groupMembers = this._getObservations(obs.groupMembers);
      }
      return this._isValidObs(obs);
    });
  }
  /* eslint-disable no-param-reassign */

  // deprecated
  storeChildRef(ref) {
    if (ref) this.childControls[ref.props.id] = ref;
  }

  _isNewVoidedObs(obs) {
    return !obs.uuid && obs.voided;
  }

  _isValidObs(obs) {
    return !this._isNewVoidedObs(obs);
  }

  areAllVoided(observations) {
    return observations.every((obs) => obs.voided);
  }

  render() {
    const { metadata: { controls, name: formName, version: formVersion }, validate } = this.props;
    const childProps = {
      collapse: this.state.collapse,
      errors: this.state.errors,
      formName,
      formVersion,
      ref: this.storeChildRef,
      onValueChanged: this.onValueChanged,
      onControlAdd: this.onControlAdd,
      onControlRemove: this.onControlRemove,
      validate,
    };
    const groupedRowControls = getGroupedControls(controls, 'row');
    const records = this.state.data.children;
    return (
      <div>{displayRowControls(groupedRowControls, records, childProps)}</div>
    );
  }
}

Container.propTypes = {
  collapse: PropTypes.bool.isRequired,
  metadata: PropTypes.shape({
    controls: React.PropTypes.arrayOf(
      React.PropTypes.shape({
        type: PropTypes.string.isRequired,
      })).isRequired,
    id: PropTypes.number.isRequired,
    uuid: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    version: PropTypes.string.isRequired,
  }),
  observations: PropTypes.array.isRequired,
  validate: PropTypes.bool.isRequired,
};

