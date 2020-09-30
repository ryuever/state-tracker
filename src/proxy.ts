import {
  isObject,
  TRACKER,
  shallowCopy,
  isTrackable,
  hasOwnProperty,
  createHiddenProperty,
} from './commons';
import ProxyTracker from './proxyTracker';
import context from './context';
import {
  IProxyTracker,
  ProxyTrackerInterface,
  TrackerNode,
  ProxyTrackerConfig,
  ProxyTrackerFunctions,
  PropProperty,
} from './types';

const peek = (proxy: IProxyTracker, accessPath: Array<string>) => { // eslint-disable-line
  return accessPath.reduce((proxy, cur) => {
    const tracker = proxy[TRACKER];
    tracker.isPeeking = true;
    const nextProxy = proxy[cur] as any;
    tracker.isPeeking = false;
    return nextProxy;
  }, proxy);
};

function createTracker(
  target: any,
  config: ProxyTrackerConfig,
  trackerNode: TrackerNode
): IProxyTracker {
  const { accessPath = [], parentProxy, useRevoke, useScope, rootPath = [] } =
    config || {};

  if (!isObject(target)) {
    throw new TypeError(
      'Cannot create proxy with a non-object as target or handler'
    );
  }

  console.log('shallow start');

  const copy = shallowCopy(target);

  console.log('shallow end');

  const internalProps = [
    TRACKER,
    'revoke',
    'runFn',
    'unlink',
    'getProp',
    'setProp',
    'getProps',
    'createChild',
  ];

  // can not use this in handler, should be `target`
  const handler = {
    get: (target: IProxyTracker, prop: PropertyKey, receiver: any) => {
      debugger;
      console.log('prop before tracker ', prop);

      // target.runFn('assertScope');
      if (prop === TRACKER) return Reflect.get(target, prop, receiver);
      // assertScope(trackerNode, context.trackerNode)

      console.log('prop after tracker ', prop);

      const tracker = target[TRACKER];
      const base = tracker.base;

      // refer to immer...
      // if (Array.isArray(tracker)) target = tracker[0]
      const isInternalPropAccessed = internalProps.indexOf(prop as any) !== -1;
      if (isInternalPropAccessed || !hasOwnProperty(base, prop)) {
        return Reflect.get(target, prop, receiver);
      }
      const accessPath = tracker.accessPath;
      const nextAccessPath = accessPath.concat(prop as string);
      const isPeeking = tracker.isPeeking;

      if (!isPeeking) {
        // for relink return parent prop...
        if (context.trackerNode && trackerNode.id !== context.trackerNode.id) {
          const contextProxy = context.trackerNode.proxy;
          if (contextProxy) {
            const contextProxyTracker = contextProxy[TRACKER];
            const propProperties: Array<PropProperty> =
              contextProxyTracker.propProperties;
            propProperties.push({
              path: nextAccessPath,
              source: trackerNode.proxy,
            });
            tracker.propProperties = propProperties;
          }
          if (trackerNode.proxy)
            return peek(trackerNode.proxy as IProxyTracker, nextAccessPath);
        }
        tracker.reportAccessPath.call(target, nextAccessPath); // this is required
      }
      const childProxies = tracker.childProxies;
      const value = base[prop as string];

      if (!isTrackable(value)) return value;
      const childProxy = childProxies[prop as string];

      // for rebase value, if base value change, the childProxy should
      // be replaced
      if (childProxy && childProxy.base === value) {
        return childProxy;
      }
      return (childProxies[prop as string] = createTracker(
        value,
        {
          accessPath: nextAccessPath,
          parentProxy: target,
          rootPath,
          useRevoke,
          useScope,
        },
        trackerNode
      ));
    },
  };

  const tracker = new ProxyTracker({
    base: target,
    parentProxy,
    accessPath,
    rootPath,
    trackerNode,
    useRevoke,
    useScope,
  });

  const { proxy, revoke } = Proxy.revocable<IProxyTracker>(copy, handler);

  createHiddenProperty(proxy, 'getProps', function(this: IProxyTracker) {
    const args: Array<keyof ProxyTrackerInterface> = Array.prototype.slice.call(
      arguments
    );
    return args.map(prop => this[TRACKER][prop]);
  });
  createHiddenProperty(proxy, 'getProp', function(this: IProxyTracker) {
    const args: Array<keyof ProxyTrackerInterface> = Array.prototype.slice.call(
      arguments
    );
    return this[TRACKER][args[0]];
  });
  createHiddenProperty(proxy, 'setProp', function(this: IProxyTracker) {
    const args = Array.prototype.slice.call(arguments) // eslint-disable-line
    const prop = args[0];
    const value = args[1];
    // this[TRACKER][prop as keyof ProxyTrackerInterface] = value
    // @ts-ignore
    return (this[TRACKER][prop] = value);
  });
  createHiddenProperty(proxy, 'runFn', function(this: IProxyTracker): any {
    const args = Array.prototype.slice.call(arguments) // eslint-disable-line
    const fn = this[TRACKER][args[0] as keyof ProxyTrackerFunctions];
    const rest = args.slice(1);
    if (typeof fn === 'function') return (fn as Function).apply(this, rest);
  });
  createHiddenProperty(proxy, 'unlink', function(this: IProxyTracker) {
    return this.runFn('unlink');
  });
  createHiddenProperty(proxy, 'createChild', function(this: IProxyTracker) {
    const args = Array.prototype.slice.call(arguments) // eslint-disable-line
    const target = args[0] || {};
    const config = args[1] || {};
    return createTracker(
      target,
      {
        useRevoke,
        useScope,
        rootPath,
        ...config,
      },
      trackerNode
    );
  });
  createHiddenProperty(proxy, 'revoke', function(this: IProxyTracker) {
    const useRevoke = this.getProp('useRevoke');
    if (useRevoke) revoke();
  });

  createHiddenProperty(proxy, TRACKER, tracker);

  return proxy as IProxyTracker;
}

export default createTracker;
