// 1.vue-router 让我们的路由也具备响应式的功能，路径变了自动更新视图
// 2. 路由的核心， 我们要自己维护路径的切换，要维护跳转的状态， replace, push (状态信息：滚动条等)
// 3. 可以注入监听方法，路径变化后，可以通知我们

function createCurrentLocation(bases = '') {
	let { pathname, search, hash } = location
	if (bases.startsWith('#')) {
		hash.slice(1) || '/'
	}
	return pathname + search + hash
}

function buildState(back, current, forward, replaced = false, computedScroll = false) {
	return {
		back,
		current,
		forward,
		replaced,
		scroll: computedScroll ? { left: window.pageXOffset, top: window.pageYOffset } : null,
	}
}

function useHistoryStateNavigation(bases) {
	const currentLocation = {
		value: createCurrentLocation(bases), // 字符串不变. 所以加个.value
	}
	const currentState = {
		value: history.state, // 维护状态 history.state 刷新之后状态也会存在
	}

	function changeLocation(to, state, replaced) {
		history[replaced ? 'replaceState' : 'pushState'](state, null, bases + to)
		currentLocation.value = to
		currentState.value = state
	}

	if (!currentState.value) {
		// 发生跳转初始化存入状态
		changeLocation(currentLocation.value, buildState(null, currentLocation.value, null, true), true)
	}
	// console.log(currentLocation.value, currentState.value, history.state);
	function push(to, data) {
		// 做push的时候 要有两个状态，一个是跳转前的状态，一个是跳转后的状态
		const state1 = {
			...currentState.value,
			...{
				forward: to,
				scroll: {
					left: window.pageXOffset,
					top: window.pageYOffset,
				},
			},
		}
		changeLocation(currentLocation.value, state1, true) // 这一步是存储数据，不是跳转
		let state2 = {
			...buildState(currentLocation.value, to, null),
			...data,
		}
		changeLocation(to, state2, false) // 这一步是跳转,false是push，真的跳转
	}
	function replace(to, data) {
		let state = {
			//构建一个全新的状态，替换当前的路径，自定义的数据添加进去
			...buildState(currentState.value.back, to, currentState.value.forward, true),
			...data,
		}
		changeLocation(to, state, true)
	}

	return {
		location: currentLocation,
		state: currentState,
		push,
		replace,
	}
}

function useHistoryListener(currentLocation, currentState) {
	let listens = []
	function listen(callback) {
		listens.push(callback)
	}
	window.addEventListener('popstate', ({ state }) => {
		const from = currentLocation.value
		currentLocation.value = createCurrentLocation()
		currentState.value = state
		listens.forEach(callback => callback(currentLocation.value, from, state))
	})
	return {
		listen,
	}
}

export function createWebHistory(bases = '') {
	// 1. 实现维护路径和状态
	const historyNavigation = useHistoryStateNavigation(bases)
	// const { location, state, push } = historyNavigation
	// 2. 监听前进后退事件
	const useHistoryListeners = useHistoryListener(
		historyNavigation.location,
		historyNavigation.state
	)
	// listen((to, from, state) => {
	//   console.log(to, from.state)
	// })

	const routerHistory = {
		...historyNavigation,
		...useHistoryListeners,
	}
	Object.defineProperty(routerHistory, 'location', {
		//代理location属性
		get: function () {
			return historyNavigation.location.value
		},
	})
	Object.defineProperty(routerHistory, 'state', {
		// 代理state属性
		get: function () {
			return historyNavigation.state.value
		},
	})

	return routerHistory
}
