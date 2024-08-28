/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { APIClient, useAPIClient, useRequest } from '@nocobase/client';
import { Spin } from 'antd';
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import type { IResource } from '@nocobase/sdk';

import { useMobileTitle } from './MobileTitle';

export interface MobileRouteItem {
  id: number;
  schemaUid?: string;
  type: 'page' | 'link' | 'tabs';
  options?: any;
  title?: string;
  icon?: string;
  parentId?: number;
  children?: MobileRouteItem[];
}

export const MobileRoutesContext = createContext<MobileRoutesContextValue>(null);

export interface MobileRoutesContextValue {
  routeList?: MobileRouteItem[];
  refresh: () => Promise<any>;
  resource: IResource;
  schemaResource: IResource;
  activeTabBarItem?: MobileRouteItem;
  activeTabItem?: MobileRouteItem;
  api: APIClient;
}
MobileRoutesContext.displayName = 'MobileRoutesContext';

export const useMobileRoutes = () => {
  return useContext(MobileRoutesContext);
};

function useActiveTabBar(routeList: MobileRouteItem[]) {
  const { pathname } = useLocation();
  const urlMap = routeList.reduce<Record<string, MobileRouteItem>>((map, item) => {
    const url = item.schemaUid ? `/${item.type}/${item.schemaUid}` : item.options?.url;
    if (url) {
      map[url] = item;
    }
    if (item.children) {
      item.children.forEach((child) => {
        const childUrl = child.schemaUid ? `${url}/${child.type}/${child.schemaUid}` : child.options?.url;
        if (childUrl) {
          map[childUrl] = child;
        }
      });
    }
    return map;
  }, {});
  const activeTabBarItem = Object.values(urlMap).find((item) => {
    if (item.schemaUid) {
      return pathname.includes(`/${item.schemaUid}`);
    }
    if (item.options.url) {
      return pathname.includes(item.options.url);
    }
    return false;
  });

  return {
    activeTabBarItem, // 第一层
    activeTabItem: urlMap[pathname] || activeTabBarItem, // 任意层
  };
}

function useTitle(activeTabBar: MobileRouteItem) {
  const context = useMobileTitle();
  useEffect(() => {
    if (!context) return;
    if (activeTabBar) {
      context.setTitle(activeTabBar.title);
      document.title = activeTabBar.title;
    }
  }, [activeTabBar, context]);
}

export const MobileRoutesProvider = ({ children }) => {
  const api = useAPIClient();
  const resource = useMemo(() => api.resource('mobileRoutes'), [api]);
  const schemaResource = useMemo(() => api.resource('uiSchemas'), [api]);
  const {
    data,
    runAsync: refresh,
    loading,
  } = useRequest<{ data: MobileRouteItem[] }>(() =>
    resource.list({ tree: true, sort: 'sort' }).then((res) => res.data),
  );
  const routeList = useMemo(() => data?.data || [], [data]);
  const { activeTabBarItem, activeTabItem } = useActiveTabBar(routeList);

  useTitle(activeTabBarItem);

  if (loading) {
    return (
      <div data-testid="mobile-loading" style={{ textAlign: 'center', margin: '20px 0' }}>
        <Spin />
      </div>
    );
  }
  return (
    <MobileRoutesContext.Provider
      value={{ api, activeTabBarItem, activeTabItem, routeList, refresh, resource, schemaResource }}
    >
      {children}
    </MobileRoutesContext.Provider>
  );
};
