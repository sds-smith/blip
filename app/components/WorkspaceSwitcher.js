import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { translate } from 'react-i18next';
import filter from 'lodash/filter';
import find from 'lodash/find';
import forEach from 'lodash/forEach';
import has from 'lodash/has';
import map from 'lodash/map';
import values from 'lodash/values';
import KeyboardArrowDownRoundedIcon from '@material-ui/icons/KeyboardArrowDownRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import { Flex , Box } from 'rebass/styled-components';

import {
  usePopupState,
  bindPopover,
  bindTrigger,
} from 'material-ui-popup-state/hooks';

import { useToasts } from '../providers/ToastProvider';
import { useIsFirstRender } from '../core/hooks';
import * as actions from '../redux/actions';
import Button from '../components/elements/Button';
import Popover from '../components/elements/Popover';

const WorkspaceSwitcher = props => {
  const { t, api } = props;
  const dispatch = useDispatch();
  const { set: setToast } = useToasts();
  const isFirstRender = useIsFirstRender();
  const loggedInUserId = useSelector((state) => state.blip.loggedInUserId);
  const clinics = useSelector((state) => state.blip.clinics);
  const selectedClinicId = useSelector((state) => state.blip.selectedClinicId);
  const { fetchingClinicsForClinician } = useSelector((state) => state.blip.working);

  const popupState = usePopupState({
    variant: 'popover',
    popupId: 'jumpMenu',
  });

  const personalWorkspaceOption = { id: null, label: 'Personal Workspace' };

  const [menuOptions, setMenuOptions] = useState([personalWorkspaceOption])
  const [selectedClinic, setSelectedClinic] = useState(menuOptions[0]);

  // Fetchers
  useEffect(() => {
    if (loggedInUserId) {
      forEach([
        {
          workingState: fetchingClinicsForClinician,
          action: actions.async.getClinicsForClinician.bind(null, api, loggedInUserId),
        },
      ], ({ workingState, action }) => {
        if (
          !workingState.inProgress &&
          !workingState.completed &&
          !workingState.notification
        ) {
          dispatch(action());
        }
      });
    }
  }, [loggedInUserId]);

  useEffect(() => {
    const selected = find(menuOptions, {id: selectedClinicId})
    setSelectedClinic(selected);

    dispatch(actions.async.fetchPatientsForClinic(api, selectedClinicId));

    //TODO: Should I toast anything here? Will it not be obvious enough on it's own?
    if (!isFirstRender) {
      setToast({
        message: t('You are now using the {{workspace}}', { workspace: selected.label }),
        variant: 'success',
        anchorOrigin: {
          horizontal: 'left',
          vertical: 'top',
        },
      });
    }
  }, [selectedClinicId]);

  useEffect(() => {
    const userClinics = filter(values(clinics), ({ clinicians }) => has(clinicians, loggedInUserId));

    setMenuOptions([
      personalWorkspaceOption,
      ...map(userClinics, clinic => ({
        id: clinic.id,
        label: t('{{name}} Workspace', { name: clinic.name }),
      })),
    ])
  }, [clinics]);

  const handleSelect = option => {
    dispatch(actions.sync.selectClinic(option.id));
    popupState.close();
  };

  return (
    <Flex width="400px" justifyContent="center">
      <Button
        variant="textPrimary"
        color="text.primary"
        fontSize={2}
        {...bindTrigger(popupState)}
        icon={KeyboardArrowDownRoundedIcon}
        iconLabel="Search By"
      >
        {selectedClinic?.label}
      </Button>

      <Popover
        width="15em"
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        {...bindPopover(popupState)}
      >
        <Box py={2}>
          {map(menuOptions, (option, key) => (
            <Button
              variant="textPrimary"
              color="text.primary"
              width="100%"
              py={2}
              px={3}
              justifyContent="space-between"
              key={key}
              fontSize={2}
              icon={option.id === selectedClinic.id ? CheckRoundedIcon : null}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </Button>
          ))}
        </Box>
      </Popover>
    </Flex>
  );
};

WorkspaceSwitcher.propTypes = {
  api: PropTypes.object.isRequired,
  trackMetric: PropTypes.func.isRequired,
};

export default translate()(WorkspaceSwitcher);
