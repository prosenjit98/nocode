/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { RecursionField, useField, useFieldSchema } from '@formily/react';
import {
  BackButtonUsedInSubPage,
  SchemaComponent,
  SchemaInitializer,
  TabsContextProvider,
  useActionContext,
  useApp,
  useTabsContext,
} from '@nocobase/client';
import _ from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePluginTranslation } from '../../locale';
import { BasicZIndexProvider, MIN_Z_INDEX_INCREMENT, useBasicZIndex } from '../BasicZIndexProvider';
import { useMobileActionPageStyle } from './MobileActionPage.style';
import { MobileTabsForMobileActionPage } from './MobileTabsForMobileActionPage';

const components = { Tabs: MobileTabsForMobileActionPage };

/**
 * 把 popup:common:addBlock 替换为移动端专属的值。当退出子页面时，再换回来。
 *
 * 之所以要把这个过程放到子页面组件这里，是因为 dataBlocks 的 useChildren 必须要在子页面的上下文中运行。
 *
 * @param supportsDataBlocks 支持在子页面中使用的数据区块 name
 */
const useMobileBlockInitializersInSubpage = (
  supportsDataBlocks = ['details', 'editForm', 'createForm', 'table', 'gridCard'],
) => {
  const app = useApp();
  const [originalInitializers] = useState<SchemaInitializer>(() =>
    app.schemaInitializerManager.get('popup:common:addBlock'),
  );
  const { t } = usePluginTranslation();
  const { visible } = useActionContext();

  const dataBlocks = originalInitializers.options.items.find((item) => item.name === 'dataBlocks');
  const dataBlocksChildren = [...dataBlocks.useChildren(), ...dataBlocks.children];

  const [newInitializers] = useState<SchemaInitializer>(() => {
    const options = _.cloneDeep(originalInitializers.options);
    options.items = options.items.filter((item) => {
      if (item.name === 'dataBlocks') {
        item.title = t('Desktop data blocks');
        item.children = dataBlocksChildren.filter((child) => {
          return supportsDataBlocks.includes(child.name);
        });
        item.useChildren = () => [];
        return true;
      }

      if (item.name === 'otherBlocks') {
        item.title = t('Other desktop blocks');
      }

      return item.name !== 'filterBlocks';
    });

    return new SchemaInitializer(options);
  });

  useEffect(() => {
    return () => {
      app.schemaInitializerManager.add(originalInitializers);
    };
  }, [app, originalInitializers]);

  if (visible) {
    // 把 PC 端子页面的 Add block 按钮换成移动端的。在退出移动端时，再换回来
    app.schemaInitializerManager.add(newInitializers);
  }
};

/**
 * 在移动端通过 Action 按钮打开的页面
 * @returns
 */
export const MobileActionPage = ({ level, footerNodeName }) => {
  useMobileBlockInitializersInSubpage();

  const field = useField();
  const fieldSchema = useFieldSchema();
  const ctx = useActionContext();
  const { styles } = useMobileActionPageStyle();
  const tabContext = useTabsContext();
  const containerDOM = useMemo(() => document.querySelector('.nb-mobile-subpages-slot'), []);
  const { basicZIndex } = useBasicZIndex();

  // in nested popups, basicZIndex is an accumulated value to ensure that
  // the z-index of the current level is always higher than the previous level
  const newZIndex = basicZIndex + MIN_Z_INDEX_INCREMENT + (level || 1);

  const footerSchema = fieldSchema.reduceProperties((buf, s) => {
    if (s['x-component'] === footerNodeName) {
      return s;
    }
    return buf;
  });

  const zIndexStyle = useMemo(() => {
    return {
      zIndex: newZIndex,
    };
  }, [newZIndex]);

  if (!ctx.visible) {
    return null;
  }

  const actionPageNode = (
    <BasicZIndexProvider basicZIndex={newZIndex}>
      <div className={styles.container} style={zIndexStyle}>
        <TabsContextProvider {...tabContext} tabBarExtraContent={<BackButtonUsedInSubPage />} tabBarGutter={48}>
          <SchemaComponent components={components} schema={fieldSchema} onlyRenderProperties />
        </TabsContextProvider>
        {footerSchema && (
          <div className={styles.footer} style={zIndexStyle}>
            <RecursionField
              basePath={field.address}
              schema={fieldSchema}
              onlyRenderProperties
              filterProperties={(s) => {
                return s['x-component'] === footerNodeName;
              }}
            />
          </div>
        )}
      </div>
    </BasicZIndexProvider>
  );

  if (containerDOM) {
    return createPortal(actionPageNode, containerDOM);
  }

  return actionPageNode;
};
