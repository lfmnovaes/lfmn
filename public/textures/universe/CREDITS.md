# Universe assets and implementation credits

Downloaded October 1, 2026. Maps are illustrative, with varying coverage and enhanced colors; they are not a scientific simulation. No NASA or creator endorsement is implied.

All maps except Pluto are by **Solar System Scope / INOVE**, based on NASA imagery and elevation data, distributed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). [Source and terms](https://www.solarsystemscope.com/textures/).

| Local WebP | Original source file |
| --- | --- |
| sun | [2k_sun.jpg](https://www.solarsystemscope.com/textures/download/2k_sun.jpg) |
| mercury | [2k_mercury.jpg](https://www.solarsystemscope.com/textures/download/2k_mercury.jpg) |
| venus | [2k_venus_atmosphere.jpg](https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg) |
| earth | [2k_earth_daymap.jpg](https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg) |
| mars | [2k_mars.jpg](https://www.solarsystemscope.com/textures/download/2k_mars.jpg) |
| jupiter | [2k_jupiter.jpg](https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg) |
| saturn | [2k_saturn.jpg](https://www.solarsystemscope.com/textures/download/2k_saturn.jpg) |
| uranus | [2k_uranus.jpg](https://www.solarsystemscope.com/textures/download/2k_uranus.jpg) |
| neptune | [2k_neptune.jpg](https://www.solarsystemscope.com/textures/download/2k_neptune.jpg) |
| clouds | [2k_earth_clouds.jpg](https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg) |
| galaxy | [2k_stars_milky_way.jpg](https://www.solarsystemscope.com/textures/download/2k_stars_milky_way.jpg) |

Pluto: **NASA / Johns Hopkins University Applied Physics Laboratory / Southwest Research Institute**, [PIA11707 Pluto Color Map](https://www.jpl.nasa.gov/images/pia11707-pluto-color-map/), [original JPEG](https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA11707.jpg), used under [JPL's Image Use Policy](https://www.jpl.nasa.gov/jpl-image-use-policy/).

Modifications: resized to 1024×512 and converted to WebP at quality 78 using Sharp; no cropping. Clouds use 512×256, with luminance converted to alpha over white and alpha quality 60. This limits decorative texture transfer and GPU memory. Saturn's rings use an original procedural radial-band map; no external ring asset is used.

Camera, planet layers, asteroid instancing, Sun GLSL, and effect settings adapt Tan Phan's [ExperienceOrbit, revision 0d488deae979d06dd19d15638161502d5fd8af47](https://github.com/TanPhan263/portfolio-website/tree/0d488deae979d06dd19d15638161502d5fd8af47/src/containers/experience-orbit). No reference texture files, portfolio content, or persisted stores were copied.

The U4 refinement checked the same scene files at [ExperienceOrbit revision 5fbfd22](https://github.com/TanPhan263/portfolio-website/tree/5fbfd2256a9d2c6780aac7b83ca8fd4df37368a2/src/containers/experience-orbit); those files were unchanged from the original adaptation. Its warm-core/pink-disc/cool-arm galaxy layout is adapted into one bounded particle field. Surface coloring, axial tilts, spin rates, atmospheric rims, and banded rings are project adaptations, at an illustrative scale.

Point-size, twinkle, and radial-glow shader patterns adapt [Drei Stars](https://github.com/pmndrs/drei/blob/bf6f4addf47467d3885de272d94ca5127f6ef68f/src/core/Stars.tsx) and [Sparkles](https://github.com/pmndrs/drei/blob/bf6f4addf47467d3885de272d94ca5127f6ef68f/src/core/Sparkles.tsx), revision **bf6f4addf47467d3885de272d94ca5127f6ef68f**. Drei is not installed; only the adapted shader patterns are used. Its notice follows.

```
MIT License

Copyright (c) 2020 react-spring

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
```
