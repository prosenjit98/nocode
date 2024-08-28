/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlugin } from '@nocobase/client';
import { isDesktop } from 'react-device-detect';

import PluginMobileClient from '../index';

export const MobileCheckerProvider = React.memo((props) => {
  const location = useLocation();
  const navigation = useNavigate();
  const mobilePlugin = usePlugin(PluginMobileClient);

  useEffect(() => {
    if (!isDesktop && location.pathname.startsWith(mobilePlugin.router.get('admin').path)) {
      navigation(mobilePlugin.mobileBasename, { replace: true });
    }
  }, [location.pathname]);

  return <>{props.children}</>;
});
MobileCheckerProvider.displayName = 'MobileCheckerProvider';
