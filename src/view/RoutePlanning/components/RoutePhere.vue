<template>
	<div class="routeSphereContainer">
		<div ref="cesiumContainerRef" class="cesiumContainer"></div>
	</div>
</template>

<script setup>
import * as Cesium from 'cesium'
import {get_daily_realtime_tiles} from '@/api'
const props = defineProps({
	initialCoords: { type: Array, default: () => [-180, 30, 180, 90] },
	routePorts: {type: Array, default: () => []},
	selectedStartPoint: { type: String, default: '' },
	selectedEndPoint: { type: String, default: '' },
	routeResult: { type: Object, default: null }
})

const viewer = ref(null)
const imageryLayers = ref(null)
const cesiumContainerRef = ref(null)
const seaIceLayer = ref(null)
const routeLayer = ref(null)
const dailyForecastData = ref(null) // 未来14天预报帧数据
let creditEl = null
const portEntities = new Map()
const resultImageLayers = ref([])
const routePointEntities = ref([])
const routeLineEntity = ref(null)
const routeEndpointEntities = ref([])
const focusableRouteEntities = ref([])
const hoverFocusedEntity = ref(null)
const selectedFocusedEntity = ref(null)
const activeFocusedEntity = ref(null)
let routeFocusHandler = null
let routeAnimationTimer = null
const websiteUrl = import.meta.env.VITE_WEBSITE_URL || ''

const PORT_ENTITY_ID_PREFIX = 'route-port-'
const START_PORT_COLOR = Cesium.Color.fromCssColorString('#2fa35f')
const END_PORT_COLOR = Cesium.Color.fromCssColorString('#2f75c9')
const DEFAULT_PORT_COLOR = Cesium.Color.fromCssColorString('#c95454')

const getPortStyle = (name) => {
	const isStart = name === props.selectedStartPoint
	const isEnd = name === props.selectedEndPoint

	if (isStart) {
		return {
			selected: true,
			color: START_PORT_COLOR
		}
	}

	if (isEnd) {
		return {
			selected: true,
			color: END_PORT_COLOR
		}
	}

	return {
		selected: false,
		color: DEFAULT_PORT_COLOR
	}
}

const clearPortEntities = () => {
	if (!viewer.value) return
	for (const entity of portEntities.values()) {
		viewer.value.entities.remove(entity)
	}
	portEntities.clear()
}

const clearResultLayers = () => {
	if (!imageryLayers.value) return
	for (const layer of resultImageLayers.value) {
		try {
			imageryLayers.value.remove(layer, true)
		} catch (e) {
			// ignore
		}
	}
	resultImageLayers.value = []
}

const clearRouteEntities = () => {
	if (!viewer.value) return
	clearRouteFocusState()
	focusableRouteEntities.value = []
	if (routeLineEntity.value) {
		try {
			viewer.value.entities.remove(routeLineEntity.value)
		} catch (e) {
			// ignore
		}
		routeLineEntity.value = null
	}

	for (const pointEntity of routePointEntities.value) {
		try {
			viewer.value.entities.remove(pointEntity)
		} catch (e) {
			// ignore
		}
	}
	routePointEntities.value = []

	for (const endpointEntity of routeEndpointEntities.value) {
		try {
			viewer.value.entities.remove(endpointEntity)
		} catch (e) {
			// ignore
		}
	}
	routeEndpointEntities.value = []

	if (routeAnimationTimer) {
		clearInterval(routeAnimationTimer)
		routeAnimationTimer = null
	}
}

const isEntityFocusable = (entity) => {
	return !!entity && focusableRouteEntities.value.includes(entity)
}

const hideEntityLabel = (entity) => {
	if (!entity?.label) return
	entity.label.show = false
}

const showEntityLabel = (entity) => {
	if (!entity?.label) return
	entity.label.show = true
}

const updateFocusedEntityDisplay = () => {
	const nextActive = hoverFocusedEntity.value || selectedFocusedEntity.value || null
	if (activeFocusedEntity.value && activeFocusedEntity.value !== nextActive) {
		hideEntityLabel(activeFocusedEntity.value)
	}
	if (nextActive) {
		showEntityLabel(nextActive)
	}
	activeFocusedEntity.value = nextActive
}

const clearRouteFocusState = () => {
	hoverFocusedEntity.value = null
	selectedFocusedEntity.value = null
	if (activeFocusedEntity.value) {
		hideEntityLabel(activeFocusedEntity.value)
	}
	activeFocusedEntity.value = null
}

const formatCoordinate = (value) => {
	const numericValue = Number(value)
	if (!Number.isFinite(numericValue)) return '-'
	return numericValue.toFixed(4)
}

const getCoordinateLabelText = ({ lat, lon, title = '' }) => {
	const lines = []
	if (title) lines.push(title)
	lines.push(`Lat: ${formatCoordinate(lat)}`)
	lines.push(`Lon: ${formatCoordinate(lon)}`)
	return lines.join('\n')
}

const getRoutePointTitle = (index) => `Route Point : ${index}`

const createCoordinateDescription = ({ lat, lon, title = '' }) => {
	const titleLine = title ? `<div><strong>${title}</strong></div>` : ''
	return `
		<div style="line-height: 1.7; font-size: 13px;">
			${titleLine}
			<div><strong>Latitude:</strong> ${formatCoordinate(lat)}</div>
			<div><strong>Longitude:</strong> ${formatCoordinate(lon)}</div>
		</div>
	`
}

const setupRouteFocusInteraction = () => {
	if (!viewer.value) return

	if (routeFocusHandler) {
		routeFocusHandler.destroy()
		routeFocusHandler = null
	}

	routeFocusHandler = new Cesium.ScreenSpaceEventHandler(viewer.value.scene.canvas)

	routeFocusHandler.setInputAction((movement) => {
		const picked = viewer.value.scene.pick(movement.endPosition)
		const pickedEntity = picked?.id
		hoverFocusedEntity.value = isEntityFocusable(pickedEntity) ? pickedEntity : null
		updateFocusedEntityDisplay()
	}, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

	routeFocusHandler.setInputAction((movement) => {
		const picked = viewer.value.scene.pick(movement.position)
		const pickedEntity = picked?.id
		selectedFocusedEntity.value = isEntityFocusable(pickedEntity) ? pickedEntity : null
		updateFocusedEntityDisplay()
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const resolveAssetUrl = (url) => {
	if (!url || typeof url !== 'string') return ''
	if (/^https?:\/\//i.test(url)) return url
	if (url.startsWith('/')) return `${websiteUrl}${url}`
	return `${websiteUrl}/${url}`
}

const renderPortEntities = () => {
	if (!viewer.value) return

	clearPortEntities()

	for (const port of props.routePorts) {
		if (typeof port?.lat !== 'number' || typeof port?.lon !== 'number' || !port?.name) continue

		const { selected, color } = getPortStyle(port.name)
		const portEntityId = `${PORT_ENTITY_ID_PREFIX}${port.name}`
		const entity = viewer.value.entities.add({
			id: portEntityId,
			name: port.name,
			description: `
				<div style="line-height: 1.7; font-size: 13px;">
					<div><strong>ID:</strong> ${portEntityId}</div>
					<div><strong>Latitude:</strong> ${port.lat}</div>
					<div><strong>Longitude:</strong> ${port.lon}</div>
				</div>
			`,
			position: Cesium.Cartesian3.fromDegrees(port.lon, port.lat),
			point: {
				pixelSize: selected ? 14 : 9,
				color,
				outlineColor: Cesium.Color.WHITE.withAlpha(0.92),
				outlineWidth: selected ? 1.8 : 1.2,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		})

		portEntities.set(port.name, entity)
	}
}

const resolveRectangle = (item = {}) => {
	if (Array.isArray(item?.rectangle) && item.rectangle.length === 4) {
		return Cesium.Rectangle.fromDegrees(...item.rectangle)
	}

	const corners = [item.west, item.south, item.east, item.north]
	if (corners.every((value) => typeof value === 'number')) {
		return Cesium.Rectangle.fromDegrees(...corners)
	}

	return Cesium.Rectangle.fromDegrees(...props.initialCoords)
}

const normalizeImageItems = (result) => {
	if (!result) return []

	const imageCandidates = result.cesium_images
		|| result.images
		|| result.cesiumImageList
		|| result.cesium_image_urls
		|| result.tiles
		|| []

	if (typeof imageCandidates === 'string') {
		return [{ url: resolveAssetUrl(imageCandidates) }]
	}

	const normalized = Array.isArray(imageCandidates)
		? imageCandidates
		.map((item) => {
			if (typeof item === 'string') {
				return { url: resolveAssetUrl(item) }
			}

			const rectangleDegrees = item?.rectangle_degrees || item?.rectangle
			return {
				url: resolveAssetUrl(item.url || item.path || item.image_url || item.cesium_image_url || ''),
				rectangle: Array.isArray(rectangleDegrees)
					? rectangleDegrees
					: rectangleDegrees
						? [
							rectangleDegrees.west,
							rectangleDegrees.south,
							rectangleDegrees.east,
							rectangleDegrees.north
						]
						: item.rectangle,
				west: item.west,
				south: item.south,
				east: item.east,
				north: item.north,
				alpha: item.alpha
			}
		})
		.filter((item) => !!item.url)
		: []

	const singleCesiumUrl = result.n3125_cesium_image_url
		|| result?.n3125_image?.cesium_image_url
		|| result?.n3125_image?.cesium_meta?.image_path

	if (singleCesiumUrl) {
		const rectangle = result.n3125_cesium_rectangle
			|| result?.n3125_image?.cesium_meta?.rectangle_degrees

		normalized.push({
			url: resolveAssetUrl(singleCesiumUrl),
			rectangle: rectangle
				? [rectangle.west, rectangle.south, rectangle.east, rectangle.north]
				: undefined,
			alpha: 0.86
		})
	}

	return normalized
}

const renderRouteImageLayers = async (result) => {
	if (!imageryLayers.value) return
	clearResultLayers()

	const items = normalizeImageItems(result)
	for (const item of items) {
		try {
			let provider
			if (item.url.includes('{z}') && item.url.includes('{x}') && item.url.includes('{y}')) {
				provider = new Cesium.UrlTemplateImageryProvider({
					url: item.url,
					rectangle: resolveRectangle(item)
				})
			} else {
				provider = await Cesium.SingleTileImageryProvider.fromUrl(item.url, {
					rectangle: resolveRectangle(item)
				})
			}
			const layer = imageryLayers.value.addImageryProvider(provider)
			layer.alpha = typeof item.alpha === 'number' ? item.alpha : 0.82
			resultImageLayers.value.push(layer)
		} catch (e) {
			// ignore single layer errors and keep processing remaining layers
		}
	}
}

const normalizeRoutePoints = (result) => {
	if (!result) return []
	const pointCandidates = result.route_points || result.path_points || result.points || result.path || []
	if (!Array.isArray(pointCandidates)) return []

	return pointCandidates
		.map((point) => {
			if (Array.isArray(point) && point.length >= 2) {
				return { lon: Number(point[0]), lat: Number(point[1]) }
			}

			const lon = Number(point?.lon ?? point?.lng ?? point?.longitude ?? point?.x)
			const lat = Number(point?.lat ?? point?.latitude ?? point?.y)
			if (Number.isNaN(lon) || Number.isNaN(lat)) return null
			return { lon, lat }
		})
		.filter(Boolean)
}

const getPortCoordinateByName = (portName) => {
	if (!portName) return null
	const matchedPort = props.routePorts.find((port) => port?.name === portName)
	if (!matchedPort) return null
	const lat = Number(matchedPort.lat)
	const lon = Number(matchedPort.lon)
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
	return { lat, lon }
}

const buildRouteRenderData = (result) => {
	const keyPoints = normalizeRoutePoints(result)
	const startPortName = result?.start_port || props.selectedStartPoint || ''
	const endPortName = result?.end_port || props.selectedEndPoint || ''

	const startPoint = getPortCoordinateByName(startPortName)
	const endPoint = getPortCoordinateByName(endPortName)

	const linePoints = []
	if (startPoint) {
		linePoints.push(startPoint)
	}
	linePoints.push(...keyPoints)
	if (endPoint) {
		linePoints.push(endPoint)
	}

	const fallbackLinePoints = linePoints.length >= 2 ? linePoints : keyPoints

	return {
		keyPoints,
		linePoints: fallbackLinePoints,
		startPoint,
		endPoint,
		startPortName,
		endPortName
	}
}

const drawRoutePoints = (points, startIndex = 1) => {
	if (!viewer.value) return
	for (const [index, point] of points.entries()) {
		const pointTitle = getRoutePointTitle(startIndex + index)
		const entity = viewer.value.entities.add({
			position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat),
			description: createCoordinateDescription({
				lat: point.lat,
				lon: point.lon,
				title: pointTitle
			}),
			point: {
				pixelSize: 4,
				color: Cesium.Color.WHITE,
				outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
				outlineWidth: 1,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			label: {
				show: false,
				text: getCoordinateLabelText({ lat: point.lat, lon: point.lon, title: pointTitle }),
				font: '12px sans-serif',
				fillColor: Cesium.Color.WHITE,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 2,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				pixelOffset: new Cesium.Cartesian2(0, -18),
				horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		})
		routePointEntities.value.push(entity)
		focusableRouteEntities.value.push(entity)
	}
}

const drawAnimatedRouteLine = (points) => {
	if (!viewer.value || points.length < 2) return

	const routeCartesian = points.map((point) => Cesium.Cartesian3.fromDegrees(point.lon, point.lat))
	let progress = 2

	routeLineEntity.value = viewer.value.entities.add({
		polyline: {
			positions: new Cesium.CallbackProperty(() => {
				return routeCartesian.slice(0, Math.max(2, progress))
			}, false),
			width: 4,
			material: Cesium.Color.fromCssColorString('#ffd166')
		}
	})

	routeAnimationTimer = setInterval(() => {
		if (progress >= routeCartesian.length) {
			clearInterval(routeAnimationTimer)
			routeAnimationTimer = null
			return
		}
		progress += 1
	}, 220)
}

const drawRouteEndpoints = ({ startPoint, endPoint, startName, endName, totalPointCount }) => {
	if (!viewer.value) return

	const buildEndpointEntity = (point, title, color, routeIndex) => {
		if (!point) return
		const entity = viewer.value.entities.add({
			position: Cesium.Cartesian3.fromDegrees(point.lon, point.lat),
			description: createCoordinateDescription({
				lat: point.lat,
				lon: point.lon,
				title
			}),
			point: {
				pixelSize: 18,
				color,
				outlineColor: Cesium.Color.WHITE,
				outlineWidth: 2.4,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			},
			label: {
				show: false,
				text: getCoordinateLabelText({
					lat: point.lat,
					lon: point.lon,
					title: `${getRoutePointTitle(routeIndex)}${title ? ` (${title})` : ''}`
				}),
				font: '13px sans-serif',
				fillColor: Cesium.Color.WHITE,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 2,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				pixelOffset: new Cesium.Cartesian2(0, -22),
				horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			}
		})
		routeEndpointEntities.value.push(entity)
		focusableRouteEntities.value.push(entity)
	}

	buildEndpointEntity(startPoint, startName || 'Start', START_PORT_COLOR, 1)
	buildEndpointEntity(endPoint, endName || 'End', END_PORT_COLOR, totalPointCount)
}

const renderRouteFromResult = (result) => {
	clearRouteEntities()
	const routeData = buildRouteRenderData(result)
	if (routeData.linePoints.length < 2) return

	const routePointStartIndex = routeData.startPoint ? 2 : 1
	drawRoutePoints(routeData.keyPoints, routePointStartIndex)
	drawAnimatedRouteLine(routeData.linePoints)
	drawRouteEndpoints({
		startPoint: routeData.startPoint,
		endPoint: routeData.endPoint,
		startName: routeData.startPortName,
		endName: routeData.endPortName,
		totalPointCount: routeData.linePoints.length
	})
}

const loadRouteResult = async (result) => {
	if (!viewer.value) initCesium()
	await renderRouteImageLayers(result)
	renderRouteFromResult(result)
}

const clearRouteResult = () => {
	clearResultLayers()
	clearRouteEntities()
}

const toStartOfDay = (date) => {
	const d = new Date(date)
	d.setHours(0, 0, 0, 0)
	return d
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const getBaseLayerProvider = () => {
	return new Cesium.UrlTemplateImageryProvider({
		url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
		minimumLevel: 0,
		maximumLevel: 7
	})
}

const createOverlayProvider = async (url) => {
	return Cesium.SingleTileImageryProvider.fromUrl(url, {
		rectangle: Cesium.Rectangle.fromDegrees(...props.initialCoords)
	})
}


const mockFetchFutureSeaIceFrames = async () => {
	// TODO: 接入后端接口，返回未来14天海冰图数据。
	// 期望结构: [{ index: number, date: Date|string, url: string }]
	return []
}

const createMockRoutePoints = (frameIndex = 0) => {
	// 模拟一组从左下到右上的航线点，可替换为后端返回的真实点序列
	const base = [
		{ x: 420, y: 700 },
		{ x: 600, y: 640 },
		{ x: 800, y: 560 },
		{ x: 980, y: 500 },
		{ x: 1160, y: 430 },
		{ x: 1360, y: 360 }
	]
	const offset = (frameIndex % 4) * 8
	return base.map((p) => ({ x: p.x + offset, y: p.y - offset }))
}

const drawDashedRouteByPoints = ({ points, width = 2048, height = 1024 }) => {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	if (!ctx || !points || points.length < 2) return ''

	// 先画每个航线点的外发光，强化点位可见性
	for (const point of points) {
		ctx.fillStyle = 'rgba(255, 0, 0, 0.25)'
		ctx.beginPath()
		ctx.arc(point.x, point.y, 16, 0, Math.PI * 2)
		ctx.fill()
	}

	ctx.strokeStyle = 'rgba(255, 0, 0, 0.95)'
	ctx.lineWidth = 6
	ctx.setLineDash([16, 10])
	ctx.lineCap = 'round'
	ctx.beginPath()
	ctx.moveTo(points[0].x, points[0].y)
	for (let i = 1; i < points.length; i += 1) {
		ctx.lineTo(points[i].x, points[i].y)
	}
	ctx.stroke()

	// 再叠加实心点和白色描边，保证每个点都被着重标出
	for (const point of points) {
		ctx.fillStyle = 'rgba(255, 0, 0, 1)'
		ctx.beginPath()
		ctx.arc(point.x, point.y, 7, 0, Math.PI * 2)
		ctx.fill()

		ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
		ctx.lineWidth = 2
		ctx.setLineDash([])
		ctx.beginPath()
		ctx.arc(point.x, point.y, 7, 0, Math.PI * 2)
		ctx.stroke()
	}

	return canvas.toDataURL('image/png')
}

const mockGenerateRouteOverlay = async ({ startPoint, endPoint, frameIndex }) => {
	void startPoint
	void endPoint
	const points = createMockRoutePoints(frameIndex)
	// TODO: 接入后端接口后，将 points 替换为真实航线点序列。
	return drawDashedRouteByPoints({ points })
}

const removeLayerIfExists = (layerRef) => {
	if (!imageryLayers.value || !layerRef.value) return
	try {
		imageryLayers.value.remove(layerRef.value, true)
	} catch (e) {
		// ignore
	}
	layerRef.value = null
}

// 
const renderFrameWithRoute = async ({ frameIndex, startPoint, endPoint }) => {
	if (!imageryLayers.value) return

	const frames = await mockFetchFutureSeaIceFrames()
	if (!frames.length) return
	const safeIndex = clamp(frameIndex, 0, frames.length - 1)

	removeLayerIfExists(seaIceLayer)
	removeLayerIfExists(routeLayer)

	const seaProvider = await createOverlayProvider(frames[safeIndex].url)
	seaIceLayer.value = imageryLayers.value.addImageryProvider(seaProvider)
	seaIceLayer.value.alpha = 0.82

	const routeOverlayUrl = await mockGenerateRouteOverlay({
		startPoint,
		endPoint,
		frameIndex: safeIndex
	})
	if (!routeOverlayUrl) return
	const routeProvider = await createOverlayProvider(routeOverlayUrl)
	routeLayer.value = imageryLayers.value.addImageryProvider(routeProvider)
	routeLayer.value.alpha = 1
	imageryLayers.value.raiseToTop(routeLayer.value)
}

const toFrameIndex = (targetDate) => {
	const today = toStartOfDay(new Date())
	const selected = toStartOfDay(targetDate || today)
	const dayMs = 24 * 60 * 60 * 1000
	const diff = Math.floor((selected.getTime() - today.getTime()) / dayMs)
	return clamp(diff, 0, 13)
}

const initCesium = () => {
	if (!cesiumContainerRef.value) return

	if (!creditEl) {
		creditEl = document.createElement('div')
		creditEl.style.position = 'absolute'
		creditEl.style.width = '0px'
		creditEl.style.height = '0px'
		creditEl.style.overflow = 'hidden'
		creditEl.style.left = '-9999px'
		creditEl.style.top = '-9999px'
		document.body.appendChild(creditEl)
	}

	viewer.value = new Cesium.Viewer(cesiumContainerRef.value, {
		timeline: false,
		animation: false,
		geocoder: false,
		homeButton: false,
		sceneModePicker: false,
		baseLayerPicker: false,
		navigationHelpButton: false,
		fullscreenButton: false,
		baseLayer: new Cesium.ImageryLayer(getBaseLayerProvider()),
		creditContainer: creditEl
	})

	imageryLayers.value = viewer.value.imageryLayers
	setupRouteFocusInteraction()

	try {
		viewer.value.scene.screenSpaceCameraController.minimumZoomDistance = 250000
		viewer.value.scene.screenSpaceCameraController.maximumZoomDistance = 20000000
		viewer.value.camera.flyTo({
			destination: Cesium.Cartesian3.fromDegrees(0.0, 90.0, 8000000.0),
			orientation: {
				heading: 0.0,
				pitch: -Cesium.Math.PI_OVER_TWO,
				roll: 0.0
			},
			duration: 1.5
		})
	} catch (e) {
		// ignore
	}
}

const renderMockRoute = async ({ targetDate, startPoint, endPoint }) => {
	if (!viewer.value) initCesium()
	const frameIndex = toFrameIndex(targetDate)
	await renderFrameWithRoute({ frameIndex, startPoint, endPoint })
	return { frameIndex }
}


const fetchDailyForecastData = async () => {
    try {
        const response = await get_daily_realtime_tiles()
        dailyForecastData.value = response || []
    } catch (e) {
        dailyForecastData.value = []
    }
}

onMounted(async () => {
	initCesium()
	renderPortEntities()
    await fetchDailyForecastData()
	await renderFrameWithRoute({
		frameIndex: 0,
		startPoint: props.selectedStartPoint || props.routePorts[0]?.name || '',
		endPoint: props.selectedEndPoint || props.routePorts[1]?.name || props.routePorts[0]?.name || ''
	})

	if (props.routeResult) {
		await loadRouteResult(props.routeResult)
	}
})

watch(
	() => [props.routePorts, props.selectedStartPoint, props.selectedEndPoint],
	() => {
		renderPortEntities()
	},
	{ deep: true }
)

watch(
	() => props.routeResult,
	(newResult) => {
		if (!newResult) {
			clearResultLayers()
			clearRouteEntities()
			return
		}
		loadRouteResult(newResult)
	},
	{ deep: true }
)

onBeforeUnmount(() => {
	if (routeFocusHandler) {
		routeFocusHandler.destroy()
		routeFocusHandler = null
	}

	if (viewer.value && !viewer.value.isDestroyed()) {
		try {
			viewer.value.destroy()
		} catch (e) {
			// ignore
		}
	}

	try {
		if (creditEl && creditEl.parentNode) {
			creditEl.parentNode.removeChild(creditEl)
		}
	} catch (e) {
		// ignore
	}
	creditEl = null
	portEntities.clear()
	clearResultLayers()
	clearRouteEntities()
})

defineExpose({ renderMockRoute, loadRouteResult, clearRouteResult })
</script>

<style scoped lang="scss">
.routeSphereContainer {
	width: 100%;
	height: 100%;
}

.cesiumContainer {
	width: 100%;
	height: 100%;
	border-radius: 10px;
	overflow: hidden;
}
</style>
