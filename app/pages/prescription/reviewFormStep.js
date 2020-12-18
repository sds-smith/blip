import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import { FastField, useFormikContext } from 'formik';
import { Box, Flex, BoxProps } from 'rebass/styled-components';
import bows from 'bows';
import find from 'lodash/find';
import flattenDeep from 'lodash/flattenDeep';
import get from 'lodash/get';
import map from 'lodash/map';
import capitalize from 'lodash/capitalize';
import isArray from 'lodash/isArray';
import EditRoundedIcon from '@material-ui/icons/EditRounded';
import FileCopyRoundedIcon from '@material-ui/icons/FileCopyRounded';
import { components as vizComponents } from '@tidepool/viz';

import { fieldsAreValid, getThresholdWarning } from '../../core/forms';
import { useInitialFocusedInput } from '../../core/hooks';
import { insulinModelOptions, stepValidationFields, warningThresholds } from './prescriptionFormConstants';
import i18next from '../../core/language';
import { convertMsPer24ToTimeString } from '../../core/datetime';
import { Body1, Headline, Paragraph1 } from '../../components/elements/FontStyles';
import Checkbox from '../../components/elements/Checkbox';
import Icon from '../../components/elements/Icon';
import baseTheme from '../../themes/baseTheme';
import PopoverLabel from '../../components/elements/PopoverLabel';

import {
  fieldsetStyles,
  checkboxStyles,
} from './prescriptionFormStyles';

const { ClipboardButton } = vizComponents;
const t = i18next.t.bind(i18next);
const log = bows('PrescriptionReview');

const fieldsetPropTypes = {
  ...BoxProps,
  pump: PropTypes.object,
  t: PropTypes.func.isRequired,
};

const patientRows = values => ([
  {
    label: t('Email'),
    value: get(values, 'email'),
    step: [0, 2],
  },
  {
    label: t('Mobile Number'),
    value: get(values, 'phoneNumber.number'),
    step: [1, 0],
  },
  {
    label: t('Type of Account'),
    value: capitalize(get(values, 'accountType', '')),
    step: [0, 0],
  },
  {
    label: t('Birthdate'),
    value: get(values, 'birthday'),
    step: [0, 1],
    initialFocusedInput: 'birthday',
  },
  {
    label: t('Gender'),
    value: capitalize(get(values, 'sex', '')),
    step: [1, 2],
  },
  {
    label: t('MRN'),
    value: get(values, 'mrn'),
    step: [1, 1],
  },
]);

const therapySettingsRows = (pump) => {
  const { values } = useFormikContext();
  const bgUnits = values.initialSettings.bloodGlucoseUnits;
  const thresholds = warningThresholds(pump, bgUnits, values);
  const emptyValueText = t('Not specified');

  return [
    {
      id: 'cpt-training',
      label: t('CPT Training Required'),
      value: (() => {
        if (!values.training) return emptyValueText;
        return values.training === 'inModule' ? t('Not required') : t('Required');
      })(),
    },
    {
      id: 'glucose-safety-limit',
      label: t('Glucose Safety Limit'),
      value: `${values.initialSettings.glucoseSafetyLimit} ${bgUnits}`,
      warning: getThresholdWarning(values.initialSettings.glucoseSafetyLimit, thresholds.glucoseSafetyLimit)
    },
    {
      id: 'correction-range',
      label: t('Correction Range'),
      value: map(
        values.initialSettings.bloodGlucoseTargetSchedule,
        ({ high, low, start }) => `${convertMsPer24ToTimeString(start)}: ${low} - ${high} ${bgUnits}`
      ),
      warning: map(
        values.initialSettings.bloodGlucoseTargetSchedule,
        (val) => {
          const warnings = [];
          const lowWarning = getThresholdWarning(val.low, thresholds.bloodGlucoseTarget);
          const highWarning = getThresholdWarning(val.high, thresholds.bloodGlucoseTarget);

          if (lowWarning) warnings.push(t('Lower Target: {{lowWarning}}', { lowWarning }));
          if (highWarning) warnings.push(t('Upper Target: {{highWarning}}', { highWarning }));

          return warnings.length ? warnings : null;
        }
      ),
    },
    {
      id: 'premeal-range',
      label: t('Pre-meal Correction Range'),
      value: (() => {
        const lowValue = get(values, 'initialSettings.bloodGlucoseTargetPreprandial.low');
        const highValue = get(values, 'initialSettings.bloodGlucoseTargetPreprandial.high');
        return (lowValue && highValue) ? `${lowValue} - ${highValue} ${bgUnits}` : emptyValueText;
      })(),
      warning: (() => {
        const warnings = [];
        const lowWarning = getThresholdWarning(get(values,'initialSettings.bloodGlucoseTargetPreprandial.low'), thresholds.bloodGlucoseTargetPreprandial);
        const highWarning = getThresholdWarning(get(values,'initialSettings.bloodGlucoseTargetPreprandial.high'), thresholds.bloodGlucoseTargetPreprandial);

        if (lowWarning) warnings.push(t('Lower Target: {{lowWarning}}', { lowWarning }));
        if (highWarning) warnings.push(t('Upper Target: {{highWarning}}', { highWarning }));

        return warnings.length ? warnings : null;
      })(),
    },
    {
      id: 'workout-range',
      label: t('Workout Correction Range'),
      value: (() => {
        const lowValue = get(values, 'initialSettings.bloodGlucoseTargetPhysicalActivity.low');
        const highValue = get(values, 'initialSettings.bloodGlucoseTargetPhysicalActivity.high');
        return (lowValue && highValue) ? `${lowValue} - ${highValue} ${bgUnits}` : emptyValueText;
      })(),
      warning: (() => {
        const warnings = [];
        const lowWarning = getThresholdWarning(get(values,'initialSettings.bloodGlucoseTargetPhysicalActivity.low'), thresholds.bloodGlucoseTargetPhysicalActivity);
        const highWarning = getThresholdWarning(get(values,'initialSettings.bloodGlucoseTargetPhysicalActivity.high'), thresholds.bloodGlucoseTargetPhysicalActivity);

        if (lowWarning) warnings.push(t('Lower Target: {{lowWarning}}', { lowWarning }));
        if (highWarning) warnings.push(t('Upper Target: {{highWarning}}', { highWarning }));

        return warnings.length ? warnings : null;
      })(),
    },
    {
      id: 'carb-ratio-schedule',
      label: t('Insulin to Carbohydrate Ratios'),
      value: map(
        values.initialSettings.carbohydrateRatioSchedule,
        ({ amount, start }) => `${convertMsPer24ToTimeString(start)}: ${amount} g/U`
      ),
      warning: map(
        values.initialSettings.carbohydrateRatioSchedule,
        (val) => getThresholdWarning(val.amount, thresholds.carbRatio)
      ),
    },
    {
      id: 'basal-schedule',
      label: t('Basal Rates'),
      value: map(
        values.initialSettings.basalRateSchedule,
        ({ rate, start }) => `${convertMsPer24ToTimeString(start)}: ${rate} U/hr`
      ),
      warning: map(
        values.initialSettings.basalRateSchedule,
        (val) => getThresholdWarning(val.rate, thresholds.basalRate)
      ),
    },
    {
      id: 'delivery-limits',
      label: t('Delivery Limits'),
      value: [
        t('Max Basal: {{value}}', { value: `${values.initialSettings.basalRateMaximum.value} U/hr` }),
        t('Max Bolus: {{value}}', { value: `${values.initialSettings.bolusAmountMaximum.value} U` }),
      ],
      warning: [
        getThresholdWarning(values.initialSettings.basalRateMaximum.value, thresholds.basalRateMaximum),
        getThresholdWarning(values.initialSettings.bolusAmountMaximum.value, thresholds.bolusAmountMaximum),
      ],
    },
    {
      id: 'insulin-model',
      label: t('Insulin Model'),
      value: get(find(insulinModelOptions, { value: values.initialSettings.insulinModel }), 'label', ''),
    },
    {
      id: 'isf-schedule',
      label: t('Insulin Sensitivity Factor'),
      value: map(
        values.initialSettings.insulinSensitivitySchedule,
        ({ amount, start }) => `${convertMsPer24ToTimeString(start)}: ${amount} ${bgUnits}`
      ),
      warning: map(
        values.initialSettings.insulinSensitivitySchedule,
        (val) => getThresholdWarning(val.amount, thresholds.insulinSensitivityFactor)
      ),
    },
  ];
};

export const PatientInfo = props => {
  const {
    t,
    handlers: { activeStepUpdate },
    ...themeProps
  } = props;

  const initialFocusedInputRef = useInitialFocusedInput();

  const nameStep = [0, 1];
  const currentStep = [3, 0];

  const { values } = useFormikContext();

  const {
    firstName,
    lastName,
  } = values;

  const patientName = `${firstName} ${lastName}`;
  const rows = patientRows(values);

  const Row = ({ label, value, step, initialFocusedInput }) => (
    <Flex mb={4} justifyContent="space-between" alignItems="center">
      <Body1>{label}</Body1>
      <Box>
        <Flex alignItems="center">
          <Body1 mr={3}>{value}</Body1>
          <Icon
            variant="button"
            icon={EditRoundedIcon}
            label={t('Edit {{label}}', { label })}
            title={t('Edit {{label}}', { label })}
            onClick={() => activeStepUpdate(step, currentStep, initialFocusedInput)}
          />
        </Flex>
      </Box>
    </Flex>
  );

  return (
    <Box {...themeProps}>
      <Flex mb={4} alignItems="center" justifyContent="space-between">
        <Headline mr={2}>{patientName}</Headline>
        <Icon
            variant="button"
            icon={EditRoundedIcon}
            label={t('Edit Patient Name')}
            title={t('Edit Patient Name')}
            onClick={() => activeStepUpdate(nameStep, currentStep)}
            innerRef={initialFocusedInputRef}
          />
      </Flex>
      {map(rows, (row, index) => <Row {...row} key={index} />)}
    </Box>
  );
};

PatientInfo.propTypes = fieldsetPropTypes;

export const TherapySettings = props => {
  const {
    t,
    handlers: { activeStepUpdate, generateTherapySettingsOrderText, handleCopyTherapySettingsClicked },
    pump,
    ...themeProps
  } = props;

  const therapySettingsStep = [2, 0];
  const currentStep = [3, 0];

  const { values } = useFormikContext();

  const {
    firstName,
    lastName,
  } = values;

  const patientName = `${firstName} ${lastName}`;

  const rows = therapySettingsRows(pump, values);

  const Row = ({ label, value, warning, id, index }) => {
    const values = isArray(value) ? value : [value];
    const warnings = isArray(warning) ? warning: [warning];
    const colors = map(warnings, message => message ? 'feedback.warning' : 'text.primary');

    return (
      <Flex
        py={3}
        sx={{
          borderTop: index === 0 ? 'default' : 'none',
          borderBottom: 'default',
        }}
        alignItems="flex-start"
      >
        <Body1 flex="1">{label}</Body1>
        <Box flex="1">
          {map(values, (val, i) => (
            <Flex key={i}>
              <Body1 color={colors[i]} key={i} flexGrow={1}>{val}</Body1>
              {warnings[i] && (
                <PopoverLabel
                  id={`${id}-${i}`}
                  width="auto"
                  popoverContent={(
                    <Box p={3}>
                      {isArray(warnings[i])
                        ? map(warnings[i], (message, i) => <Paragraph1 key={i}>{message}</Paragraph1>)
                        : <Paragraph1>{warnings[i]}</Paragraph1>
                      }
                    </Box>
                  )}
                />
              )}
            </Flex>
          ))}
        </Box>
      </Flex>
    );
  };

  return (
    <Box {...themeProps}>
      <Flex mb={3} alignItems="center" justifyContent="space-between">
        <Headline mr={2}>{t('Confirm Therapy Settings')}</Headline>
        <Box
          theme={baseTheme}
          sx={{
            button: {
              border: 'none',
              color: 'text.primary',
              paddingRight: 0,
              '&:hover,&:active': {
                border: 'none',
                color: 'text.primary',
                backgroundColor: 'transparent',
              },
            },
            '.success': {
              padding: '.25em 0 0',
              display: 'block',
              fontSize: '1.5em',
              textAlign: 'center',
              lineHeight: '1.125em',
            },
          }}
        >
          <Icon
            variant="button"
            icon={EditRoundedIcon}
            label={t('Edit therapy settings')}
            title={t('Edit therapy settings')}
            onClick={() => activeStepUpdate(therapySettingsStep, currentStep)}
          />

          <ClipboardButton
            buttonTitle={t('Copy therapy settings order as text')}
            buttonText={(
              <Icon
                variant="button"
                icon={FileCopyRoundedIcon}
                label={t('Copy therapy settings order as text')}
                title={t('Copy therapy settings order as text')}
              />
            )}
            successText={<span className="success">{t('✓')}</span>}
            onClick={handleCopyTherapySettingsClicked}
            getText={generateTherapySettingsOrderText.bind(null, [
              {
                label: t('Name'),
                value: patientName,
              },
              ...patientRows(values),
            ], therapySettingsRows(pump, values))}
          />
        </Box>
      </Flex>

      <Box mb={4} as={Body1}>{t('Are you sure you want to start {{patientName}} with the below therapy settings order?', { patientName })}</Box>

      <Box mb={4}>
        {map(rows, (row, index) => <Row {...row} index={index} key={index} />)}
      </Box>

      <Box mb={4}>
        <FastField
          as={Checkbox}
          id="therapySettingsReviewed"
          name="therapySettingsReviewed"
          checked={!!values.therapySettingsReviewed}
          required
          label={t('I have confirmed the therapy settings order for this patient')}
          {...checkboxStyles}
        />
      </Box>
    </Box>
  );
};

TherapySettings.propTypes = fieldsetPropTypes;

export const PrescriptionReview = translate()(props => (
  <Flex
    flexWrap="wrap"
    margin="auto"
    maxWidth="1280px"
  >
    <PatientInfo
      {...fieldsetStyles}
      flex="0 0 auto"
      alignSelf="flex-start"
      mb={4}
      px={4}
      py={3}
      width={[1, 1, 0.45, 0.35]}
      sx={{
        border: 'default',
      }}
      {...props}
    />
    <TherapySettings
      {...fieldsetStyles}
      flex="0 0 auto"
      mb={4}
      pr={[4, 4, 0, 0]}
      pl={[4, 4, 5, 7]}
      py={3}
      width={[1, 1, 0.55, 0.65]}
      {...props}
    />
  </Flex>
));

const reviewFormStep = (schema, pump, handlers, values) => ({
  label: t('Review and Save Prescription'), // TODO: [Save | Send] depending on clinician role once implemented in backend
  completeText: t('Save Prescription'), // TODO: [Save | Send] depending on clinician role once implemented in backend
  disableComplete: !fieldsAreValid(flattenDeep(stepValidationFields), schema, values),
  panelContent: <PrescriptionReview pump={pump} handlers={handlers} />
});

export default reviewFormStep;
