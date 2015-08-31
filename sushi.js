/*
	Sushi: fast image loading previews.

	Version:	0.9
	Author: 	Tom Hadlaw
	Contact:	tomhadlaw144@gmail.com
	Website:	https://tommy144.wordpress.com/

	The MIT License (MIT)
	
	Copyright (c) 2015 Tom Hadlaw <tomhadlaw144@gmail.com>
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

// (aprox) Two dimensional Gaussian function maps onto a single variable.
// where 'theta' is our standard deviation.
function twoDimensionalGaussian(x, y, theta) {
  return (1.0 / (2 * Math.PI * theta * theta)) *
    Math.pow(Math.E, -1.0 * (x * x + y * y) / (2 * theta * theta)); 
}

// Maps centered x,y coordinates onto a matrix.
function mapOntoCenteredMatrix(x, y, n) {
  return Math.floor(n/2) + (Math.floor(n/2) * n) + x + (y * n)
}

// Generates a normalized two dimensional Gaussian matrix.
function normalGaussianMatrix(n, theta) { 
  var M = new Array(n * n);
  var sum = 0;
  var nmid = Math.floor(n/2);
  for (var x = -nmid; x <= nmid; x++) {
    for (var y = -nmid; y <= nmid; y++) {
      var currGauss = twoDimensionalGaussian(x, y, theta);
      sum += currGauss;
      M[mapOntoCenteredMatrix(x,y,n)] = currGauss;
    }
  }
  var nsquared = n * n;
  for (var i = 0; i < nsquared; i++) {
    M[i] = M[i] / sum; //normalize.
  }
  return M
}

// Indexes 1d array like 2d array.
function index2dArray(x, y, w, h) {
  return x + y * w;
}

// Returns index of matrix given an x,y and offset.
function xyOffsetIndex(i, x, y, w, h) {
  var index = i + x + y * w;
  var absx = (i % w) + x;
  if (absx < 0 && index < 0 || absx >= w && index >= w * h) {
    return i - x - y * w;
  }
  if (absx < 0 || absx >= w) { // if off the left.
    return i - x + y * w;
  }
  //var absy = index - (w * y)
  if (index < 0 || index >= w * h) { // if off top/bottom.
    return i + x - y * w;
  }
  return index;
}

// Performs gaussian blur (SLOW!).
function filterGaussian(data, w, h, n, theta, phi) {
  var sizeOfPixel = 4;
  var M = normalGaussianMatrix(n, theta);
  var dataLength = w * h * sizeOfPixel;
  for (var i = 0; i < dataLength; i+=4) {
    var sumR = 0;
    var sumG = 0; 
    var sumB = 0;
    var nmid = Math.floor(n/2);
    for (var x = -nmid; x <= nmid; x++) {
      for (var y = -nmid; y <= nmid; y++) {
        var index = mapOntoCenteredMatrix(x, y, n);
        var dataIndex = xyOffsetIndex(i/4, x, y, w, h); //* sizeOfPixel;
        if (i/4 === 255) {
          dataIndex = xyOffsetIndex(i/4, x, -y, w, h); //* sizeOfPixel;
        }
        var epsilon;
        epsilon = M[mapOntoCenteredMatrix(x, y, n)];
        dataIndex *= sizeOfPixel;
        sumR += data[dataIndex + 0] * epsilon * phi;  
        sumG += data[dataIndex + 1] * epsilon * phi;  
        sumB += data[dataIndex + 2] * epsilon * phi;  
      }
      data[i + 0] = sumR;
      data[i + 1] = sumG;
      data[i + 2] = sumB;
    }
  }
  return data;
}

// Explodes data pixel array to larger resolution.
function explodeImage(data, w, h, targetw, targeth) {
  var wfac = Math.floor(targetw / w);
  var vfac = Math.floor(targeth / h);
  var imgdata = new ImageData(targetw, Math.floor(targeth));
  for (var i = 0; i < data.length; i+=4) {
    var R = data[i + 0];
    var G = data[i + 1];
    var B = data[i + 2];
    var A = data[i + 3];
    var x = i % w * wfac;
    var index = i / 4;
    var x = index % w;
    var y = Math.floor(index / w);
    drawSquare(imgdata.data, x * wfac, y * vfac, wfac, vfac, R, G, B, A, targetw);
  }
  return imgdata;
}

// Draws square on an image of specified color.
function drawSquare(data, x, y, w, h, R, G, B, A, width) {
  var start = x * 4 + y * width * 4;
  for (var i = 0; i < h; i++) {
    for (var j = 0; j < w * 4; j+=4) {
      data[start + width * i * 4 + j + 0] = R;
      data[start + width * i * 4 + j + 1] = G;
      data[start + width * i * 4 + j + 2] = B;
      data[start + width * i * 4 + j + 3] = A;
    }
  }
}

// Encodes image data to b64 string.
function encodeBase64String(data, w, h) {
  var str = "";
  for (var i = 0; i < data.length; i++) {
    str = str.concat(btoa(data[i]));
  }
  return str;
}

// Decodes image from b64 string.
function decodeBase64Image(s, w, h) {
  var imgdata = new ImageData(w, h);
  for (var i = 0; i < s.length; i+=4) {
    imgdata.data[i / 4] = atob(s.substring(i, i + 4));
  }
  return imgdata;
}

