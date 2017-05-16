// @flow

'use strict'

type TYVBO = {
  name: string;
  value: number;
  stride: number;
}

type TYUniform = {
  name: string;
  type: string;
  value: any;
}

type TYColor = {
  r: number;
  g: number;
  b: number;
  a: number;
}

type TYViewport = {
  x: number;
  y: number;
  width: number;
  height: number;
}

class RenderingContext {
  canvas: HTMLCanvasElement
  gl: WebGLRenderingContext

  static AdditiveBlending = 'AdditiveBlending'

  constructor(id: string) {
    const canvas = ((document.getElementById(id): any): ?HTMLCanvasElement)
    if (canvas == null) {
      throw new Error(`Missing HTMLCanvasElement id: ${id}`)
    }
    this.canvas = canvas

    const gl = canvas.getContext('webgl')
    if (gl == null) {
      throw new Error('')
    }
    this.gl = gl
  }

  createProgram(ids: Array<string>): WebGLProgram {
    const gl = this.gl
    const program = gl.createProgram()

    ids.forEach(id => {
      gl.attachShader(program, this.createShader(id))
    })

    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program))
    }

    return program
  }

  useProgram(program: WebGLProgram) {
    this.gl.useProgram(program)
  }

  createShader(id: string): WebGLShader {
    const gl = this.gl
    const source = ((document.getElementById(id): any): ?HTMLScriptElement)

    if (source == null) {
      throw new Error('')
    }

    let shader: WebGLShader

    switch (source.type) {
      case 'x-shader/x-vertex':
        shader = gl.createShader(gl.VERTEX_SHADER)
        break
      case 'x-shader/x-fragment':
        shader = gl.createShader(gl.FRAGMENT_SHADER)
        break
      default:
        throw new Error('The shader type is not an accepted value.')
    }

    if (shader == null) {
      throw new Error('')
    }

    gl.shaderSource(shader, source.text)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader))
    }

    return shader
  }

  bindFramebuffer(frameBuffer: WebGLFramebuffer) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, frameBuffer)
  }

  createFrameBuffer(width: number, height: number) {
    const gl = this.gl
    const frameBuffer = gl.createFramebuffer()

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)

    const renderBuffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer)

    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      renderBuffer
    )

    const texture = this.createFrameBufferTexture(width, height)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return { value: frameBuffer, renderbuffer: renderBuffer, texture: texture }
  }

  createFrameBufferTexture(width: number, height: number): WebGLTexture {
    const gl = this.gl
    const texture: WebGLTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    )

    gl.bindTexture(gl.TEXTURE_2D, null)

    return texture
  }

  bindVbos(program: WebGLProgram, vbos: Array<TYVBO>) {
    vbos.forEach(vbo => {
      this.bindVbo(program, vbo)
    })
  }

  bindVbo(program: WebGLProgram, vbo: TYVBO) {
    const gl = this.gl
    const location: number = gl.getAttribLocation(program, vbo.name)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.createVbo(vbo.value))
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, vbo.stride, gl.FLOAT, false, 0, 0)
  }

  createVbo(value: number) {
    const gl = this.gl
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(value), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    return vbo
  }

  bindIbo(index: number) {
    const gl = this.gl
    const ibo: WebGLBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Int16Array(index),
      gl.STATIC_DRAW
    )
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
  }

  createCanvasTexture(canvas2d: HTMLCanvasElement): WebGLTexture {
    const gl = this.gl
    const texture: WebGLTexture = gl.createTexture()

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      canvas2d
    )
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

    gl.bindTexture(gl.TEXTURE_2D, null)

    return texture
  }

  bindTexture(texture: WebGLTexture, slot: number) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + slot)
    gl.bindTexture(gl.TEXTURE_2D, texture)
  }

  enable(cap: number) {
    this.gl.enable(cap)
  }

  disable(cap: number) {
    this.gl.disable(cap)
  }

  toggleCulFace(enable: boolean) {
    const gl = this.gl
    if (enable) {
      gl.enable(gl.CULL_FACE)
    } else {
      gl.disable(gl.CULL_FACE)
    }
  }

  toggleDepthFunc(enable: boolean) {
    const gl = this.gl
    if (enable) {
      gl.enable(gl.DEPTH_TEST)
    } else {
      gl.disable(gl.DEPTH_TEST)
    }
  }

  depthFunc() {
    const gl = this.gl
    gl.depthFunc(gl.LEQUAL)
  }

  toggleBlend(enable: boolean) {
    const gl = this.gl
    if (enable) {
      gl.enable(gl.BLEND)
    } else {
      gl.disable(gl.BLEND)
    }
  }

  setBlending(type: string) {
    const gl = this.gl
    switch (type) {
      case RenderingContext.AdditiveBlending:
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE)
        break
      default:
        break
    }
  }

  bindUniforms(program: WebGLProgram, uniforms: Array<TYUniform>) {
    uniforms.forEach(uniform => {
      this.bindUniform(program, uniform)
    })
  }

  bindUniform(program: WebGLProgram, uniform: TYUniform) {
    const gl = this.gl
    const { name, type, value } = uniform
    const location: WebGLUniformLocation = gl.getUniformLocation(program, name)

    switch (type) {
      case 'matrix4fv':
        gl.uniformMatrix4fv(location, false, value)
        break
      case '4fv':
        gl.uniform4fv(location, value)
        break
      case '3fv':
        gl.uniform3fv(location, value)
        break
      case '2fv':
        gl.uniform2fv(location, value)
        break
      case '1fv':
        gl.uniform1fv(location, value)
        break
      case '1f':
        gl.uniform1f(location, value)
        break
      case '1iv':
        gl.uniform1iv(location, value)
        break
      case '1i':
        gl.uniform1i(location, value)
        break
      default:
    }
  }

  clear(color: TYColor, depth: number) {
    const gl = this.gl
    let flag = gl.COLOR_BUFFER_BIT

    gl.clearColor(color.r, color.g, color.b, color.a)

    if (depth) {
      gl.clearDepth(depth)
      flag = flag | gl.DEPTH_BUFFER_BIT
    }

    gl.clear(flag)
  }

  viewport(viewport: TYViewport) {
    this.gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height)
  }

  drawArrays(mode: number, count: number, first: number = 0) {
    const gl = this.gl
    gl.drawArrays(mode, first, count)
  }

  drawElements(mode: number, count: number, offset: number = 0) {
    const gl = this.gl
    gl.drawElements(mode, count, gl.UNSIGNED_SHORT, offset)
  }
}

export { RenderingContext }
