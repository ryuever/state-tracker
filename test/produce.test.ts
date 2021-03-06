import { TRACKER } from '../src/commons';
import { produce as ES5Produce } from '../src/es5';
import { produce as ES6Produce } from '../src/proxy';
import StateTrackerUtil from '../src/StateTrackerUtil';

testTracker(true);
testTracker(false);

const getTrackerId = (str: string): number => {
  const matched = str.match(/(\d*)$/);
  if (matched) return parseInt(matched[1]);
  return 0;
};

function testTracker(useProxy: boolean) {
  const produce = useProxy ? ES6Produce : ES5Produce;
  const decorateDesc = (text: string) =>
    useProxy ? `proxy: ${text}` : `es5: ${text}`;

  describe(decorateDesc('test report'), () => {
    it('constructor should not be reported', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }],
        },
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      proxyState.a.a1.map((v: { value: number }, index: number) =>
        expect(v.value).toBe(index)
      );
      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const paths = trackerNode.getPaths();
      if (useProxy) {
        expect(paths).toEqual([
          ['a'],
          ['a', 'a1'],
          ['a', 'a1', 'length'],
          ['a', 'a1', '0'],
          ['a', 'a1', '0', 'value'],
          ['a', 'a1', '1'],
          ['a', 'a1', '1', 'value'],
        ]);
      } else {
        expect(paths).toEqual([
          ['a'],
          ['a', 'a1'],
          ['a', 'a1', 'length'],
          ['a', 'a1', 0],
          ['a', 'a1', 0, 'value'],
          ['a', 'a1', 1],
          ['a', 'a1', 1, 'value'],
        ]);
      }
      StateTrackerUtil.leave(proxyState);
    });

    it('Symbol(Symbol.toStringTag) should not be reported', () => {
      const state = {
        a: {
          a1: [{ value: 0 }, { value: 1 }],
        },
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      expect(Object.prototype.toString.call(proxyState.a)).toEqual(
        '[object Object]'
      );
      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const paths = trackerNode.getPaths();
      expect(paths).toEqual([['a']]);
      StateTrackerUtil.leave(proxyState);
    });

    it('length should be processed with tracker logic', () => {
      const model = {
        goods: {
          listData: [],
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'test');
      const {
        goods: { listData },
      } = state;
      expect(listData.length).toBe(0);
      StateTrackerUtil.leave(state);

      StateTrackerUtil.relink(state, ['goods'], {
        listData: [{ id: '1' }, { id: '2' }],
      });

      StateTrackerUtil.enter(state);
      const {
        goods: { listData: nextListData },
      } = state;
      expect(nextListData.length).toBe(2);
      StateTrackerUtil.leave(state);
    });
  });

  describe(decorateDesc('child proxies'), () => {
    it('Access a key which has object value will add prop to childProxies', () => {
      const state = {
        a: {
          a1: 1,
          a2: 2,
        },
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = proxyState[TRACKER];

      expect(proxyState.a).toEqual({ a1: 1, a2: 2 });
      expect(proxyState.c).toEqual(3);
      const childProxies = tracker._childProxies;
      const keys = Object.keys(childProxies);
      expect(keys).toEqual(['a']);
    });

    it('Access a key which has array value will add prop to childProxies', () => {
      const state = {
        a: [2, 3, 4],
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = proxyState[TRACKER];

      expect(proxyState.a).toEqual([2, 3, 4]);
      expect(proxyState.c).toEqual(3);
      const childProxies = tracker._childProxies;
      const keys = Object.keys(childProxies);
      expect(keys).toEqual(['a']);
    });

    it('Set a key with different type value which will cause clear up childProxies', () => {
      const state = {
        a: [2, 3, 4],
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = StateTrackerUtil.getTracker(proxyState);

      expect(proxyState.a).toEqual([2, 3, 4]);
      expect(proxyState.c).toEqual(3);
      proxyState.a = { a1: 1 };
      const childProxies = tracker._childProxies;
      const keys = Object.keys(childProxies);
      expect(keys).toEqual([]);
    });

    it('childProxies will not update even if set to value with less keys than before', () => {
      const state = {
        a: [2, 3, 4],
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
        c: 3,
      };
      const proxyState = produce(state);
      const tracker = StateTrackerUtil.getTracker(proxyState.b);

      expect(proxyState.b.b1).toEqual({ b11: 1, b12: 2 });
      expect(proxyState.c).toEqual(3);
      proxyState.b = { b1: 1 };
      const childProxies = tracker._childProxies;
      const keys = Object.keys(childProxies);
      expect(keys).toEqual(['b1']);
      expect(proxyState.b.b1).toEqual(1);
      const keys2 = Object.keys(childProxies);
      expect(keys2).toEqual([]);
    });
  });

  describe(decorateDesc('access path'), () => {
    it('verify getPaths', () => {
      const state = {
        a: {
          a1: 1,
          a2: 2,
        },
        b: {
          b1: 1,
          b2: 2,
        },
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      /* eslint-disable */
      proxyState.a;
      proxyState.a.a1;
      proxyState.a.a2;
      /* eslint-enable */

      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const paths = trackerNode.getPaths();
      expect(paths).toEqual([['a'], ['a'], ['a', 'a1'], ['a'], ['a', 'a2']]);
      const remarkable = trackerNode.getRemarkable();
      expect(remarkable).toEqual([['a', 'a1'], ['a', 'a2'], ['a']]);
      StateTrackerUtil.leave(proxyState);
    });

    it('verify getPaths: nested props', () => {
      const state = {
        a: {
          a1: 1,
          a2: 2,
        },
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      /* eslint-disable */
      proxyState.a;
      proxyState.a.a1;
      proxyState.a.a2;

      const b = proxyState.b.b1
      StateTrackerUtil.enter(proxyState)
      b.b11
      b.b12

      const subNode = StateTrackerUtil.getContext(b).getCurrent()
      const subPaths = subNode.getPaths()
      const subRemarkable = subNode.getRemarkable()
      expect(subPaths).toEqual([
        ['b', 'b1', 'b11'],
        ['b', 'b1', 'b12'],
      ])
      expect(subRemarkable).toEqual([
        ['b', 'b1', 'b11'],
        ['b', 'b1', 'b12'],
      ])
      StateTrackerUtil.leave(proxyState)
      /* eslint-enable */

      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      const paths = trackerNode.getPaths();
      expect(paths).toEqual([
        ['a'],
        ['a'],
        ['a', 'a1'],
        ['a'],
        ['a', 'a2'],
        ['b'],
        ['b', 'b1'],
      ]);
      const remarkable = trackerNode.getRemarkable();
      expect(remarkable).toEqual([
        ['a', 'a1'],
        ['a', 'a2'],
        ['a'],
        ['b', 'b1'],
      ]);
      StateTrackerUtil.leave(proxyState);
    });
  });

  describe(decorateDesc('return a proxy state with TRACKER prop'), () => {
    // it('If value is an object, then it should be a proxy state with TRACKER prop', () => {
    //   const state = {
    //     a: {
    //       a1: 1,
    //       a2: 2,
    //     },
    //     b: {
    //       b1: {
    //         b11: 1,
    //         b12: 2,
    //       },
    //       b2: 2,
    //     },
    //   };
    //   const proxyState = produce(state);
    //   const ap = proxyState.a;
    //   const bp = proxyState.b;
    //   const b1p = proxyState.b.b1;
    //   expect(ap.getTracker()).toEqual(expect.any(StateTracker));
    //   expect(bp.getTracker()).toEqual(expect.any(StateTracker));
    //   expect(b1p.getTracker()).toEqual(expect.any(StateTracker));
    // });
    // it('If value is an array, then it should be a proxy state with TRACKER prop', () => {
    //   const state = {
    //     a: [1, 2],
    //     b: [
    //       {
    //         b1: 1,
    //       },
    //     ],
    //   };
    //   const proxyState = produce(state);
    //   const ap = proxyState.a;
    //   const bp = proxyState.b;
    //   const b1p = proxyState.b[0];
    //   expect(ap.getTracker()).toEqual(expect.any(StateTracker));
    //   expect(bp.getTracker()).toEqual(expect.any(StateTracker));
    //   expect(b1p.getTracker()).toEqual(expect.any(StateTracker));
    // });
  });

  describe(decorateDesc('change value'), () => {
    it('Assigned with same object, state tracker will not be updated', () => {
      const state = {
        a: {
          a1: 1,
          a2: 2,
        },
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
      };
      const proxyState = produce(state);
      const id1 = getTrackerId(StateTrackerUtil.getTracker(proxyState.a)._id);
      proxyState.a = state.a;
      const id2 = getTrackerId(StateTrackerUtil.getTracker(proxyState.a)._id);
      if (useProxy) {
        expect(id1).toBe(id2);
      } else {
        expect(id1).toBe(id2 - 1);
      }
    });

    it('Set with different value will create new tracker', () => {
      const state = {
        a: {
          a1: 1,
          a2: 2,
        },
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: 2,
        },
      };
      const proxyState = produce(state);
      const id1 = getTrackerId(StateTrackerUtil.getTracker(proxyState.a)._id);

      proxyState.a = {
        a1: 3,
        a2: 4,
      };
      expect(proxyState.a.a1).toBe(3);

      const id2 = getTrackerId(StateTrackerUtil.getTracker(proxyState.a)._id);
      expect(id1 + 1).toBe(id2);
    });

    it('Tracker base value will be updated after try to access it value', () => {
      const old = {
        a1: 1,
        a2: 2,
      };
      const next = {
        a1: 3,
        a2: 4,
      };
      const state = {
        a: old,
      };
      const proxyState = produce(state);
      const tracker = StateTrackerUtil.getTracker(proxyState.a);

      proxyState.a = next;
      expect(tracker._base).toBe(old);
    });
  });

  describe(decorateDesc('tracker id'), () => {
    it('create tracker only if key is accessed', () => {
      const state = {
        a: {
          a1: 1,
          a2: 2,
        },
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: [2],
        },
      };
      const proxyState = produce(state);
      const id1 = getTrackerId(
        StateTrackerUtil.getTracker(proxyState.b.b2)._id
      );
      const id2 = getTrackerId(
        StateTrackerUtil.getTracker(proxyState.b.b1)._id
      );
      expect(id2).toBeGreaterThan(id1);
    });
  });

  describe(decorateDesc('relink'), () => {
    it('relink an object', () => {
      const state = {
        a: {
          a1: {
            a11: 2,
          },
          a2: {
            a21: 3,
          },
        },
        b: {
          b1: {
            b11: 1,
            b12: 2,
          },
          b2: [2],
        },
      };
      const proxyState = produce(state);
      /* eslint-disable */
      proxyState.a;
      proxyState.a.a1;
      proxyState.a.a2;
      /* eslint-enable */

      StateTrackerUtil.relink(proxyState, ['a'], {
        a1: {
          a11: 3,
        },
        a2: 4,
      });

      const childProxies = StateTrackerUtil.getTracker(proxyState.a)
        ._childProxies;
      expect(Object.keys(childProxies)).toEqual(['a1', 'a2']);
      expect(proxyState.a.a2).toBe(4);
      expect(Object.keys(childProxies)).toEqual(['a1']);

      StateTrackerUtil.relink(proxyState, ['a'], {
        a1: 5,
        a2: 6,
      });
      expect(proxyState.a.a1).toBe(5);
      expect(proxyState.a.a2).toBe(6);
    });

    it('batchRelink will return a draft object', () => {
      const state = {
        a: {
          a1: {
            a11: 1,
          },
          a2: {
            a21: 4,
          },
        },
        b: {
          b1: 2,
        },
      };

      const proxyState = produce(state);
      const draft = StateTrackerUtil.batchRelink(proxyState, [
        {
          path: ['a'],
          value: {
            a1: {
              a11: 3,
            },
          },
        },
      ]);

      expect(draft.a.a1.a11).toBe(1);
      expect(proxyState.a.a1.a11).toBe(3);
      proxyState.b.b1 = 4;
      // expect(draft.b.b1).toBe(2);
      expect(proxyState.b.b1).toBe(4);
    });
  });

  describe(decorateDesc('proxy handler'), () => {
    it('symbol should not be reported', () => {
      const state = {
        a: {
          a1: 1,
        },
      };
      const proxyState = produce(state);
      /* eslint-disable */
      StateTrackerUtil.enter(proxyState)
      Object.prototype.toString.call(proxyState.a)
      /* eslint-enable */
      const trackerNode = StateTrackerUtil.getContext(proxyState).getCurrent();
      expect(trackerNode.getPaths()).toEqual([['a']]);
      StateTrackerUtil.leave(proxyState);
    });

    it('`isPeekingStrictly` to avoid getter loop', () => {
      type Item = { value: number };
      const state: { a: Array<Item> } = {
        a: [{ value: 1 }, { value: 2 }],
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      proxyState.a
        .sort((a: Item, b: Item) => a.value - b.value)
        .filter((v: Item) => v.value > 1);
      StateTrackerUtil.leave(proxyState);
    });

    it('unConfigurable property should not be delete', () => {
      const state = {
        a: {
          a1: null,
        },
      };
      const proxyState = produce(state);
      StateTrackerUtil.enter(proxyState);
      proxyState.a.a1 = [{ a11: 1 }];
      proxyState.a.a1.map((v: any) => v.a11);
      StateTrackerUtil.leave(proxyState);
    });
  });

  describe(decorateDesc('operations'), () => {
    it('If retryProxy exist, childProxies[prop] base should be update', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      let header = promotionInfo.header;

      StateTrackerUtil.enter(state, 'level2');
      StateTrackerUtil.leave(state);
      StateTrackerUtil.leave(state);

      StateTrackerUtil.relink(state, ['promotionInfo'], {
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
        },
      });

      StateTrackerUtil.enter(state, 'level2');
      header = StateTrackerUtil.peek(state, ['promotionInfo', 'header']);
      expect(header.presellDeposit.deposit).toEqual(2);
      expect(header.presellDeposit.deduction).toEqual(3);
      StateTrackerUtil.leave(state);
    });

    it('update an array value', () => {
      const model = {
        goods: {
          listData: [],
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'test');
      const {
        goods: { listData },
      } = state;
      expect(listData.length).toBe(0);
      StateTrackerUtil.leave(state);

      StateTrackerUtil.relink(state, ['goods'], {
        listData: [{ id: '1' }, { id: '2' }],
      });

      StateTrackerUtil.enter(state);
      const {
        goods: { listData: nextListData },
      } = state;
      expect(nextListData.length).toBe(2);
      StateTrackerUtil.leave(state);

      let count = 0;

      StateTrackerUtil.enter(state, 'goods');
      const info = StateTrackerUtil.peek(state, ['goods']);
      info.listData.map(() => count++);

      expect(count === 2).toBe(true);
    });

    it('update an empty object', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      let header = promotionInfo.header;

      StateTrackerUtil.enter(state, 'level2');
      expect(header.presellDeposit).toEqual({});

      StateTrackerUtil.leave(state);

      StateTrackerUtil.leave(state);

      StateTrackerUtil.relink(state, ['promotionInfo'], {
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
        },
      });

      StateTrackerUtil.enter(state, 'level2');
      header = StateTrackerUtil.peek(state, ['promotionInfo', 'header']);
      const presellDeposit = header.presellDeposit;
      expect(presellDeposit.deposit).toEqual(2);
      expect(presellDeposit.deduction).toEqual(3);
      StateTrackerUtil.leave(state);
    });
  });

  describe(decorateDesc('test backward access'), () => {
    it('Basically, access an outer variable will not trigger backward access.', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
            price: 3,
            selected: false,
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      const header = promotionInfo.header;
      StateTrackerUtil.enter(state, 'level2');
      expect(header.price).toBe(3);
      StateTrackerUtil.leave(state);
      StateTrackerUtil.leave(state);
    });

    it('Destructor an object will trigger an backward access', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
            price: 3,
            selected: false,
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      let header = promotionInfo.header;
      StateTrackerUtil.leave(state);

      StateTrackerUtil.relink(state, ['promotionInfo'], {
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
          price: 6,
          selected: true,
        },
      });

      StateTrackerUtil.enter(state, 'level2');
      header = StateTrackerUtil.peek(state, ['promotionInfo', 'header']);
      expect(header.presellDeposit.deposit).toBe(2);
      const { presellDeposit, price, selected } = header;
      expect(presellDeposit).toEqual({ deposit: 2, deduction: 3 });
      expect(price).toBe(6);
      expect(selected).toBe(true);
      expect(presellDeposit.deposit).toBe(2);
    });

    it('mask is used to optimize backward access times', () => {
      const model = {
        promotionInfo: {
          header: {
            presellDeposit: {},
            price: 3,
            selected: false,
          },
        },
      };

      const state = produce(model);

      StateTrackerUtil.enter(state, 'level1');
      const promotionInfo = StateTrackerUtil.peek(state, ['promotionInfo']);
      let header = promotionInfo.header;
      StateTrackerUtil.leave(state);

      StateTrackerUtil.relink(state, ['promotionInfo'], {
        header: {
          presellDeposit: {
            deposit: 2,
            deduction: 3,
          },
          price: 6,
          selected: true,
        },
      });

      StateTrackerUtil.enter(state, 'level2');
      header = StateTrackerUtil.peek(state, ['promotionInfo', 'header']);
      expect(header.presellDeposit.deposit).toBe(2);
      const { presellDeposit, price, selected } = header;
      expect(presellDeposit).toEqual({ deposit: 2, deduction: 3 });
      expect(price).toBe(6);
      expect(selected).toBe(true);

      expect(presellDeposit.deposit).toBe(2);
      expect(presellDeposit.deduction).toBe(3);
    });
  });
}
