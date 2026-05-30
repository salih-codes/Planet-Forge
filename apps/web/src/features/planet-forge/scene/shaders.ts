export const NOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
      +i.y+vec4(0.0,i1.y,i2.y,1.0))
      +i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float fbm(vec3 p){ float f=0.0,a=0.5; for(int i=0;i<4;i++){ f+=a*snoise(p); p*=2.02; a*=0.5; } return f; }
`;

export const SURFACE_VERT =
	NOISE_GLSL +
	/* glsl */ `
  varying vec3 vNormalW; varying vec3 vPosM; varying vec3 vViewDir;
  uniform float uFreq,uWater,uBanded;
  uniform vec3 uSeed;
  void main(){
    vPosM = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    
    // Dynamic 3D Vertex displacement mapping to deform the physical sphere mesh
    float h = 0.0;
    if(uBanded < 0.5) {
      vec3 p = normalize(position) * uFreq + uSeed;
      float e = fbm(p) * 0.5 + 0.5;
      
      // Mountains physically protrude outwards, oceans sit flush
      h = max(e - uWater, 0.0) * 0.055;
    }
    
    vec3 displacedPosition = position + normal * h;
    vec4 wp = modelMatrix * vec4(displacedPosition,1.0);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

export const SURFACE_FRAG =
	NOISE_GLSL +
	/* glsl */ `
  uniform float uTime,uFreq,uWater,uIce,uBanded,uEmissive,uClouds;
  uniform vec3 uSunDir,uOcean,uLand1,uLand2,uSeed;
  varying vec3 vNormalW; varying vec3 vPosM; varying vec3 vViewDir;
  void main(){
    vec3 dir=normalize(vPosM); vec3 p=dir*uFreq+uSeed;
    
    vec3 col; float oceanMask=0.0; float landMask=0.0;
    float lat=abs(dir.y);
    
    if(uBanded>0.5){
      // Dynamic flowing/swirling bands for detailed Gas Giants
      float flowSpeed = uTime * 0.08;
      vec3 flow = vec3(
        snoise(p * 0.7 + vec3(flowSpeed, 0.0, 0.0)),
        snoise(p * 0.7 + vec3(0.0, flowSpeed * 0.6, 0.0)),
        snoise(p * 0.7 + vec3(0.0, 0.0, flowSpeed * 0.5))
      );
      
      // Swirl detail layer simulating gas storm systems
      float swirl = snoise(p * 2.0 + flow * 1.3);
      vec3 warpedP = p + vec3(flow.x * 0.35 + swirl * 0.15, flow.y * 0.08, flow.z * 0.35);
      
      float bands = fbm(vec3(warpedP.x * 0.2, dir.y * 8.5 + flow.x * 0.3, warpedP.z * 0.2));
      float t = sin(dir.y * 12.0 + bands * 2.8) * 0.5 + 0.5;
      
      col = mix(uOcean, uLand1, t);
      
      // Giant Red Storms / spots
      float storm = smoothstep(0.68, 0.88, snoise(warpedP * 2.4 + vec3(flowSpeed * 1.2, 0.0, 0.0)));
      vec3 stormColor = vec3(0.55, 0.12, 0.08); // Rich storm color
      col = mix(col, stormColor, storm * 0.75);
      
      // Multi-frequency polar swirls
      float polarNoise = fbm(p * 3.5 + vec3(0.0, uTime * 0.06, 0.0));
      col = mix(col, uLand2, smoothstep(0.40, 0.90, lat + polarNoise * 0.25));
      col += 0.03 * snoise(warpedP * 5.0);
    } else {
      // Solid planets: high-fidelity fractal detail
      float e = fbm(p) * 0.5 + 0.5;
      
      // Add a secondary micro-detail noise for jagged high-fidelity coastlines
      float coastlineDetail = fbm(p * 6.5 + vec3(0.0, 0.0, 0.0)) * 0.06;
      float detailedE = e + coastlineDetail;
      
      float sea = smoothstep(uWater - 0.02, uWater + 0.02, detailedE);
      oceanMask = 1.0 - sea; landMask = sea;
      
      col = mix(uOcean, uLand1, sea);
      col = mix(col, uLand2, smoothstep(uWater + 0.15, uWater + 0.38, detailedE));
      
      // Detailed mountain peaks with mountain noise
      float peaks = smoothstep(0.68, 0.95, detailedE);
      col = mix(col, vec3(0.48, 0.42, 0.38), peaks * 0.5); // mountain stone
      
      // Ice polar caps
      float ice = smoothstep(uIce, uIce + 0.06, lat + (detailedE - 0.5) * 0.15);
      col = mix(col, vec3(0.94, 0.97, 1.0), ice);
    }
    
    // Dynamic Procedural Normal (Bump) Mapping using multi-point height gradients
    vec3 N = normalize(vNormalW);
    if(uBanded < 0.5) {
      float h = fbm(p);
      float eps = 0.015;
      
      // Calculate orthogonal tangent vectors relative to the face normal
      vec3 tangent = normalize(cross(vNormalW, vec3(0.0, 1.0, 0.0) + 1e-5 * vNormalW));
      vec3 bitangent = normalize(cross(vNormalW, tangent));
      
      float h_t = fbm(p + tangent * eps);
      float h_b = fbm(p + bitangent * eps);
      
      float dh_dt = (h_t - h) / eps;
      float dh_db = (h_b - h) / eps;
      
      // Bump intensity scaled by altitude (mountain ridges catch sharper light)
      float bumpStrength = 0.28 + smoothstep(uWater, uWater + 0.4, h) * 0.24;
      N = normalize(vNormalW - bumpStrength * (dh_dt * tangent + dh_db * bitangent));
    }
    
    vec3 L=normalize(uSunDir);
    float diff=clamp(dot(N,L),0.0,1.0); float spec=0.0;
    
    if(uBanded<0.5){ 
      vec3 H=normalize(L+vViewDir); 
      // Specular ocean sparkles / dynamic wave ripples
      float sparkle = snoise(p * 45.0 + vec3(uTime * 0.15));
      float specMask = oceanMask * (0.78 + sparkle * 0.22);
      spec=pow(max(dot(N,H),0.0),95.0)*specMask*diff * 1.5; 
    }
    
    float term=pow(1.0-abs(diff-0.12),6.0)*0.10;
    vec3 lit=col*(0.06+diff)+spec*vec3(0.9,0.95,1.0);
    
    // Volumetric cloud shadows projected along the light vector
    if(uBanded < 0.5 && uClouds > 0.5) {
      vec3 shadowDir = normalize(uSunDir);
      vec3 shadowCoord = dir * 1.9 + shadowDir * 0.28 + vec3(uSeed);
      
      float sc1 = fbm(shadowCoord);
      float sc2 = fbm(shadowCoord * 2.5 + vec3(-uTime * 0.04, uTime * 0.02, 0.0));
      float shadowNoise = sc1 * 0.65 + sc2 * 0.35;
      
      float shadowFactor = 1.0 - smoothstep(0.14, 0.44, shadowNoise) * 0.55;
      lit *= shadowFactor;
    }
    
    // Dynamic pulsating lava veins for scorched/lava solid planets
    if(uBanded < 0.5 && uWater > 0.02 && uEmissive < 0.02) {
      float e = fbm(p) * 0.5 + 0.5;
      float pulse = sin(uTime * 1.8 + e * 12.0) * 0.15 + 0.85;
      lit += uOcean * oceanMask * pulse * 0.72;
    }
    
    // Dynamic city night lights for populated planets
    if(uBanded < 0.5 && uEmissive > 0.05) {
      float nightMask = smoothstep(0.32, 0.05, diff); // only glow on night side
      
      // City grid patterns using high-frequency noise
      float cityNoise = snoise(p * 20.0 + uSeed * 1.5);
      float cityGrid = smoothstep(0.46, 0.82, cityNoise);
      
      vec3 cityColor = vec3(1.0, 0.78, 0.38); // golden city lights
      vec3 lights = cityColor * cityGrid * landMask * nightMask * uEmissive * 2.0;
      lit += lights;
    }
    
    lit+=col*uEmissive*(1.0-diff*0.6);
    lit+=vec3(1.0,0.55,0.25)*term*(1.0-uBanded);
    gl_FragColor=vec4(lit,1.0);
  }
`;

export const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uPow,uCoef,uStrength,uTime;
  uniform vec3 uSunDir;
  varying vec3 vNormalW; varying vec3 vViewDir;
  void main(){
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uSunDir);
    
    // Volumetric Fresnel glow edge thickness
    float fresnel = pow(clamp(uCoef - dot(N, V), 0.0, 1.0), uPow);
    
    // Atmospheric scattering approximation: shifts to sunset amber on the terminator lines
    float dayIntensity = clamp(dot(N, L), 0.0, 1.0);
    float sunsetTerminator = pow(1.0 - abs(dot(N, L) - 0.15), 4.0);
    
    vec3 sunsetColor = vec3(1.0, 0.44, 0.18); // deep sunset amber
    vec3 scatteredColor = mix(sunsetColor, uColor, smoothstep(0.02, 0.45, dayIntensity));
    
    // Dynamic subtle wind haze fluctuations
    float dynamicHaze = 1.0 + 0.06 * sin(uTime * 0.4 + N.y * 5.0);
    
    vec3 finalColor = scatteredColor * fresnel * uStrength * dayIntensity * dynamicHaze;
    // Add sunset edge glow
    finalColor += sunsetColor * sunsetTerminator * fresnel * uStrength * 0.48;
    
    gl_FragColor = vec4(finalColor, fresnel * 0.85);
  }
`;

// Minimal world-space varying pass-through — shared by the star + comet surfaces.
export const BODY_VERT = /* glsl */ `
  varying vec3 vPosM; varying vec3 vNormalW; varying vec3 vViewDir;
  void main(){
    vPosM = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Animated stellar surface: convective granulation, plage flares, limb darkening.
export const STAR_FRAG =
	NOISE_GLSL +
	/* glsl */ `
  uniform float uTime; uniform vec3 uColor; uniform vec3 uSeed;
  varying vec3 vPosM; varying vec3 vNormalW; varying vec3 vViewDir;
  void main(){
    vec3 dir = normalize(vPosM);
    vec3 p = dir * 3.2 + uSeed;

    // Boiling convection cells (coarse) modulated by fine churn.
    float gran = fbm(p + vec3(0.0, uTime * 0.06, 0.0)) * 0.5 + 0.5;
    float fine = fbm(p * 3.0 + vec3(uTime * 0.14)) * 0.5 + 0.5;
    float cells = gran * 0.7 + fine * 0.3;

    // Bright magnetic plages / surface flares.
    float flare = smoothstep(0.6, 0.95, snoise(p * 1.7 + vec3(uTime * 0.09)));

    vec3 hot = uColor + vec3(0.55);
    vec3 cool = uColor * 0.5;
    vec3 col = mix(cool, hot, cells);
    col = mix(col, vec3(1.0, 0.96, 0.82), flare * 0.6);

    // Limb darkening toward the silhouette edge.
    float limb = clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0);
    col *= 0.5 + 0.5 * pow(limb, 0.55);

    col *= 1.8; // keep HDR-bright so bloom blooms
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Icy/rocky comet nucleus with sun-facing sublimation jets.
export const COMET_FRAG =
	NOISE_GLSL +
	/* glsl */ `
  uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSeed;
  varying vec3 vPosM; varying vec3 vNormalW; varying vec3 vViewDir;
  void main(){
    vec3 dir = normalize(vPosM);
    vec3 p = dir * 3.6 + uSeed;

    float n = fbm(p) * 0.5 + 0.5;
    vec3 ice = vec3(0.64, 0.80, 0.94);
    vec3 rock = vec3(0.30, 0.33, 0.40);
    vec3 col = mix(rock, ice, smoothstep(0.42, 0.72, n));
    col *= 0.7 + 0.3 * (fbm(p * 4.0) * 0.5 + 0.5); // crater speckle

    vec3 N = normalize(vNormalW);
    vec3 L = normalize(uSunDir);
    float diff = clamp(dot(N, L), 0.0, 1.0);

    // Outgassing jets glow on the sun-lit side.
    float jets = pow(diff, 2.0) * (0.5 + 0.5 * snoise(p * 2.0 + vec3(uTime * 0.6)));
    vec3 lit = col * (0.12 + diff * 0.9);
    lit += vec3(0.42, 0.86, 1.0) * jets * 0.55;
    gl_FragColor = vec4(lit, 1.0);
  }
`;

export const CLOUD_FRAG =
	NOISE_GLSL +
	/* glsl */ `
  uniform float uTime, uSeed;
  uniform vec3 uSunDir;
  varying vec3 vNormalW; varying vec3 vPosM; varying vec3 vViewDir;
  void main(){
    vec3 dir = normalize(vPosM);
    
    // Smoothly moving and swirling cloud layers using domain warping
    float speed = uTime * 0.024;
    vec3 warp = vec3(
      snoise(dir * 1.2 + vec3(speed, 0.0, 0.0)),
      snoise(dir * 1.2 + vec3(0.0, speed * 0.8, 0.0)),
      snoise(dir * 1.2 + vec3(0.0, 0.0, speed))
    );
    
    vec3 cloudCoord = dir * 1.9 + warp * 0.28 + vec3(uSeed);
    
    // Multi-frequency fractal noise for wispiness
    float c1 = fbm(cloudCoord);
    float c2 = fbm(cloudCoord * 2.5 + vec3(-uTime * 0.04, uTime * 0.02, 0.0));
    float cloudNoise = c1 * 0.65 + c2 * 0.35;
    
    // Make clouds shape fluffy and soft
    float alpha = smoothstep(0.14, 0.44, cloudNoise);
    
    vec3 N = normalize(vNormalW);
    vec3 L = normalize(uSunDir);
    float diff = clamp(dot(N,L), 0.0, 1.0);
    
    // Soft high-fidelity light reflection
    vec3 cloudColor = vec3(0.96, 0.98, 1.0) * (0.16 + diff * 0.84);
    
    // Fade out clouds near planet edge (limb) for atmospheric depth
    float edgeFade = clamp(dot(N, vViewDir), 0.0, 1.0);
    alpha *= smoothstep(0.06, 0.32, edgeFade);
    
    gl_FragColor = vec4(cloudColor, alpha * 0.82);
  }
`;
