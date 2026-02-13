/**
 * Viewport feature module for 3D modeling.
 * Extensible architecture: object placement, lighting, display modes.
 */
export {
  alignObjectToGround,
  makeBoxGeometry,
  makeGeometryForPrimitive,
  getPrimitiveYOffset,
  disposeObject3D,
  makeLightBillboard,
} from './viewport-objects'
export { applyMaterialsForLighting } from './viewport-lighting'
export {
  applyDisplayMode,
  updatePolygonEdgesDisplay,
  updateVerticesDisplay,
} from './viewport-display'
export {
  PRIMITIVE_COLOR,
  WIREFRAME_COLOR,
  POLYGON_EDGE_COLOR,
  IMPORTED_DEFAULT_COLOR,
  CUBE_Y_OFFSET,
  SELECTION_BOX_COLOR,
} from './constants'
