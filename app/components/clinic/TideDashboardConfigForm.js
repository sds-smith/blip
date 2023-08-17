import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import moment from 'moment';
import includes from 'lodash/includes';
import keyBy from 'lodash/keyBy';
import map from 'lodash/map';
import reject from 'lodash/reject';
import without from 'lodash/without';
import { useFormik } from 'formik';
import { Box, BoxProps } from 'rebass/styled-components';
import { utils as vizUtils } from '@tidepool/viz';

import { TagList } from '../../components/elements/Tag';
import RadioGroup from '../../components/elements/RadioGroup';
import { useLocalStorage } from '../../core/hooks';
import { getCommonFormikFieldProps, getFieldError } from '../../core/forms';
import { tideDashboardConfigSchema as validationSchema, summaryPeriodOptions, lastUploadDateFilterOptions } from '../../core/clinicUtils';
import { Body0, Caption } from '../../components/elements/FontStyles';
import { borders } from '../../themes/baseTheme';
import { pick } from 'lodash';
import { push } from 'connected-react-router';

const { getLocalizedCeiling } = vizUtils.datetime;

function getFormValues(config, clinicPatientTags) {
  return {
    period: config?.period || null,
    lastUpload: config?.lastUpload || null,
    tags: config?.tags ? reject(config.tags, tagId => !clinicPatientTags?.[tagId]) : null,
  };
}

export function validateConfig(config, clinicPatientTags) {
  try {
    validationSchema.validateSync(getFormValues(config, clinicPatientTags));
    return true;
  } catch (err) {
    return false;
  }
};

export const TideDashboardConfigForm = props => {
  const { t, api, onFormChange, trackMetric, ...boxProps } = props;
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const selectedClinicId = useSelector((state) => state.blip.selectedClinicId);
  const loggedInUserId = useSelector((state) => state.blip.loggedInUserId);
  const clinic = useSelector(state => state.blip.clinics?.[selectedClinicId]);
  const timePrefs = useSelector((state) => state.blip.timePrefs);
  const clinicPatientTags = useMemo(() => keyBy(clinic?.patientTags, 'id'), [clinic?.patientTags]);
  const [config, setConfig] = useLocalStorage('tideDashboardConfig', {});
  const localConfigKey = [loggedInUserId, selectedClinicId].join('|');
  const isDashboardPage = (pathname === '/dashboard/tide');

  const formikContext = useFormik({
    initialValues: getFormValues(config?.[localConfigKey], clinicPatientTags),
    onSubmit: values => {
      const options = pick(values, ['tags', 'period']);
      // options.mockData = true; // TODO: delete temp mocked data response
      options.lastUploadDateTo = getLocalizedCeiling(new Date().toISOString(), timePrefs).toISOString();
      options.lastUploadDateFrom = moment(options.lastUploadDateTo).subtract(values.lastUpload, 'days').toISOString();
      if (!isDashboardPage) dispatch(push('/dashboard/tide'));

      setConfig({
        ...config,
        [localConfigKey]: values,
      });
    },
    validationSchema,
  });

  const {
    errors,
    setFieldValue,
    setFieldTouched,
    values,
  } = formikContext;

  useEffect(() => {
    onFormChange(formikContext);
  }, [values, clinicPatientTags]);

  return (
    <Box
      as="form"
      id="tide-dashboard-config-form"
      {...boxProps}
    >
      <Box id='patient-tags-select' mb={3}>
        <Body0 fontWeight="medium" mb={2}>{t('Select Patient Tag(s)')}</Body0>

        <TagList
          tags={map(clinic?.patientTags, tag => ({
            ...tag,
            selected: includes(values.tags, tag.id),
          }))}
          tagProps={{
            onClick: tagId => {
              setFieldTouched('tags', true, true);
              setFieldValue('tags', [...(values.tags || []), tagId]);
            },
            sx: { userSelect: 'none' }
          }}
          selectedTagProps={{
            onClick: tagId => {
              setFieldValue('tags', without(values.tags, tagId));
            },
            color: 'white',
            backgroundColor: 'purpleMedium',
          }}
        />

        {getFieldError('tags', formikContext) && (
          <Caption ml={2} mt={2} color="feedback.danger">
            {errors.tags}
          </Caption>
        )}
      </Box>

      <Box sx={{ borderTop: borders.default }} py={3}>
        <Body0 fontWeight="medium" mb={2}>{t('Select Duration')}</Body0>

        <RadioGroup
          options={summaryPeriodOptions}
          {...getCommonFormikFieldProps('period', formikContext)}
          variant="vertical"
        />
      </Box>

      <Box sx={{ borderTop: borders.default }} pt={3}>
        <Body0 fontWeight="medium" mb={2}>{t('Select Last Upload Date')}</Body0>

        <RadioGroup
          options={lastUploadDateFilterOptions}
          {...getCommonFormikFieldProps('lastUpload', formikContext)}
          variant="vertical"
        />
      </Box>
    </Box>
  );
};

TideDashboardConfigForm.propTypes = {
  ...BoxProps,
  api: PropTypes.object.isRequired,
  onFormChange: PropTypes.func.isRequired,
  patient: PropTypes.object,
  t: PropTypes.func.isRequired,
  trackMetric: PropTypes.func.isRequired,
};

export default translate()(TideDashboardConfigForm);
