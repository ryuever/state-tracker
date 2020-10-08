import { Type } from './';
// import { InternalFunction } from './';
import { TRACKER } from '../commons';
import StateTrackerContext from '../StateTrackerContext';

export interface ProxyStateTrackerConfig {
  accessPath?: Array<string>;
  parentProxy?: IStateTracker;
  rootPath: Array<string>;
}

export interface StateTrackerConstructorProps {
  accessPath: Array<string>;
  parentProxy: IStateTracker | null;
  rootPath: Array<string>;
  base: any;
  stateTrackerContext: StateTrackerContext;
  context: string;
  lastUpdateAt: number;
  focusKey: string | null;
}

export interface StateTrackerProperties {
  _id: string;
  _accessPath: Array<string>;
  _rootPath: Array<string>;
  _type: Type.Array | Type.Object;
  _base: {
    [key: string]: any;
  };
  _parentProxy: IStateTracker;
  _childProxies: {
    [key: string]: IStateTracker;
  };
  _isPeeking: boolean;
  _updateTimes: number;
  _context: string;
  _lastUpdateAt: number;
  _stateTrackerContext: StateTrackerContext;
  _focusKey: string | null;
}

export type StateTrackerFunctions = {
  update(newValue: any): void;
  setContext(context: string): void;
  getContext(): string;
  getId(): string;
  getBase(): {
    [key: string]: any;
  };
  setBase(value: any): void;
  getParentProxy(): IStateTracker;
  getChildProxies(): {
    [key: string]: IStateTracker;
  };
  setChildProxies(value: Array<IStateTracker>): void;
  getPeeking(): boolean;
  setPeeking(falsy: boolean): void;
  getRootPath(): Array<string>;
  getAccessPath(): Array<string>;
  getStateTrackerContext(): StateTrackerContext;
  getTime(): number;
  setTime(time: number): void;
  getFocusKey(): string | null;
  setFocusKey(key: string): void;
  getUpdateTimes(): number;
  incrementUpdateTimes(): number;
};

export type StateTrackerInterface = StateTrackerProperties &
  StateTrackerFunctions;

export interface StateTrackerConstructor {
  new ({
    accessPath,
    parentProxy,
    rootPath,
    base,
  }: StateTrackerConstructorProps): StateTrackerInterface;
}

export interface IStateTracker {
  [TRACKER]: StateTrackerInterface;

  enter(): void;
  leave(): void;
  relink(path: Array<String>, value: any): void;
  unlink(): any;
  hydrate(path: Array<String>, value: any): void;
  getContext(): StateTrackerContext;
  getTracker(): StateTrackerInterface;
  peek(path: Array<string>): IStateTracker;
  [key: string]: any;
}