/**
 * Video Production Templates - Ready-to-Use Scripts
 * Pre-generated scripts for common product types and scenarios
 * No ChatGPT call needed - just copy, customize, and produce
 */

export const VIDEO_PRODUCTION_TEMPLATES = {
  // FASHION ITEMS
  'dress-elegant': {
    scenarioId: 'fashion-flow',
    title: 'Elegant Dress Showcase',
    duration: 20,
    productType: 'Dress',
    style: 'formal-elegant',
    segments: [
      {
        number: 1,
        name: 'Introduction',
        duration: 7,
        timeCode: '0:00-0:07',
        script: `
          Opening shot: Full body standing pose, slight angle to show silhouette.
          Camera: Static wide shot at chest height.
          Lighting: Golden hour light from left, modeling the dress fabric.
          Movement: Slow 360-degree turn to showcase dress from all angles.
          Music: Uplifting classical strings, tempo 90 BPM.
          Voiceover (optional): "Experience ultimate elegance with this flowing evening gown."
        `,
        movements: [
          'Stand with poise, shoulders back',
          'Slow 360-degree rotation (5 seconds)',
          'Pause at profile to show side seams',
          'Return to front position'
        ],
        cameraWork: 'Static tripod, waist-level pov',
        lighting: 'Golden hour key light 45° left, soft fill light from right',
        musicDescription: 'Classical strings, 90 BPM, uplifting',
        notes: 'Film in natural outdoor light for best fabric presentation'
      },
      {
        number: 2,
        name: 'Detail Focus',
        duration: 7,
        timeCode: '0:07-0:14',
        script: `
          Close-up of dress details: neckline, fabric, embellishments.
          Camera: Slow zoom in on bodice area from 3 feet distance.
          Lighting: Same golden key light, add subtle rim light on back shoulder.
          Movement: Gentle hand movement showing fabric texture and flow.
          Music: Continue classical strings, slightly softer.
          Details highlighted: Quality of fabric, seam work, embroidery if present.
        `,
        movements: [
          'Raise hand to adjust/show neckline',
          'Run fingers along fabric seam',
          'Let hand fall naturally, showing sleeve movement',
          'Slight body turn to show back detail'
        ],
        cameraWork: 'Slow zoom in from 3ft to 1.5ft on bodice',
        lighting: 'Add rim light on back shoulder for dimension',
        musicDescription: 'Classical strings continue, softer',
        notes: 'Use macro lens if available for embroidery details'
      },
      {
        number: 3,
        name: 'Action & Movement',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          Action shot: Walk forward slowly, capturing fabric flow and movement.
          Camera: Following pan from side angle, maintaining chest-high framing.
          Motion: Slow, graceful walk with natural arm swing.
          Dress fabric interaction: Show how fabric drapes and flows with movement.
          Music: Build to crescendo, slight tempo increase to 100 BPM.
          Closing: Turn toward camera with confident pose, smile.
        `,
        movements: [
          'Walk forward slowly (3 steps, 4 seconds)',
          'Natural arm swing showing elegance',
          'Turn 90° to right',
          'Final pose facing camera with confidence'
        ],
        cameraWork: 'Following pan at chest height, smooth dolly movement',
        lighting: 'Maintain golden key light, reduce distance for fill',
        musicDescription: 'Classical crescendo, 100 BPM, triumphant',
        notes: 'Film on even ground, smooth walking surface required'
      }
    ],
    productHighlights: [
      'Elegant silhouette and draping',
      'High-quality fabric and seams',
      'Detailed neckline and bodice work',
      'Graceful fabric movement'
    ],
    setupRequirements: {
      location: 'Outdoor location with golden hour lighting',
      equipment: ['Camera/Phone', 'Tripod or gimbal', 'Microphone (optional)'],
      duration: '30 minutes',
      setup: 'Find location with even ground, no shadows or obstacles',
      wardrobe: 'Dress only, minimal jewelry to not distract'
    },
    editingNotes: `
      - Color grade: Warm undertones, slightly desaturated to focus on fabric
      - Transitions: Fade to black between segments
      - Text overlays: Product name in segment 1, size/material in segment 2
      - Music: Fade in at intro, fade out at end
      - Pace: Slow, deliberate edits to show elegance
    `
  },

  'jeans-casual': {
    scenarioId: 'casual-vibe',
    title: 'Casual Jeans Lifestyle',
    duration: 20,
    productType: 'Jeans',
    style: 'casual-energetic',
    segments: [
      {
        number: 1,
        name: 'Styling Scene',
        duration: 7,
        timeCode: '0:00-0:07',
        script: `
          Setup: Sitting on couch/chair, putting on jeans.
          Camera: Wide shot from front, 45-degree angle.
          Lighting: Bright natural window light, clean and fresh.
          Movement: Stand up, adjust fit, check in mirror.
          Music: Upbeat indie/pop, 110 BPM, uplifting.
          Voiceover (optional): "The perfect jeans that go with everything."
          Focus: Show fit on body, waistband comfort, length accuracy.
        `,
        movements: [
          'Sit position: legs extended showing full jeans',
          'Stand up smoothly with hands on thighs',
          'Adjust and smooth down the fit',
          'Turn to side to check in imaginary mirror',
          'Look down at jeans with satisfaction'
        ],
        cameraWork: 'Static medium shot, then pull back to wide shot on stand',
        lighting: 'Bright natural window light, front-facing',
        musicDescription: 'Upbeat indie/pop, 110 BPM, energetic',
        notes: 'Capture authentic, relatable moment'
      },
      {
        number: 2,
        name: 'Outfit Details',
        duration: 7,
        timeCode: '0:07-0:14',
        script: `
          Detail reveals: Stitching quality, pocket depth, hardware, wash color.
          Camera: Series of close-ups and medium shots.
          Angles: Front waistband, side seam, pocket detail, cuff.
          Lighting: Bright, even lighting to show color accuracy.
          Movement: Hand gestures pointing out details.
          Music: Maintain upbeat tempo, add slightly layered instrumentation.
          Highlights: Premium denim, perfect fit, versatile color for any occasion.
        `,
        movements: [
          'Point to front pockets showing depth',
          'Trace side seam with finger',
          'Lift one leg (on stool) to show cuff and length',
          'Point to hardware (buttons, rivets)',
          'Smooth hands down thighs to show fit'
        ],
        cameraWork: 'Close-ups of details, medium shots of silhouette',
        lighting: 'Bright even light, slight rim from back for dimension',
        musicDescription: 'Upbeat indie/pop continue, 110 BPM',
        notes: 'Make sure expensive-looking details are clearly visible'
      },
      {
        number: 3,
        name: 'Lifestyle Moments',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          Active lifestyle shots: Walking, casual poses, natural movements.
          Camera: Following action from distance, showing full body.
          Locations: Multiple casual settings (home, street, coffee shop if available).
          Lighting: Mixed - natural window light and daylight.
          Movement: Walking, sitting casually, laughing, interacting.
          Music: Build energy slightly, tempo 115 BPM toward end.
          Feeling: Relatable, approachable, everyday-wearable.
          Closing: Final pose looking relaxed and confident.
        `,
        movements: [
          'Walk naturally across frame (4 seconds)',
          'Sit casual on bench or chair',
          'Adjust crotch/waistband naturally',
          'Stand and move to next location',
          'Final casual lean against wall, look at camera'
        ],
        cameraWork: 'Following shots, mixed distances from 10ft to 3ft',
        lighting: 'Natural daylight, mixed indoor/outdoor',
        musicDescription: 'Upbeat indie/pop, 115 BPM, energetic',
        notes: 'Keep movements natural and relatable, not overly posed'
      }
    ],
    productHighlights: [
      'Perfect fit showing through silhouette',
      'Premium denim stitching and hardware',
      'Versatile neutral wash color',
      'High-quality pockets and seams',
      'Everyday wearability'
    ],
    setupRequirements: {
      location: 'Mix of indoor (home) and casual outdoor locations',
      equipment: ['Camera/Phone', 'Gimbal or stabilizer', 'Natural light sufficient'],
      duration: '45-60 minutes',
      setup: 'Multiple quick location changes, minimal equipment',
      wardrobe: 'Simple casual top (white tee), no distracting patterns'
    },
    editingNotes: `
      - Color grade: Slightly warm, natural skin tones, accurate denim color
      - Transitions: Quick cuts between scenes, match to music beat
      - Text overlays: Brand/model name in segment 1, fit/material in segment 2, lifestyle benefits in segment 3
      - Music: Fade in at intro, cut sharply on beats
      - Pacing: Energetic, match cuts to music tempo, 2-4 second clips
    `
  },

  'handbag-luxury': {
    scenarioId: 'product-zoom',
    title: 'Luxury Handbag Showcase',
    duration: 20,
    productType: 'Handbag',
    style: 'slow-motion-elegant',
    segments: [
      {
        number: 1,
        name: 'Grand Reveal',
        duration: 7,
        timeCode: '0:00-0:07',
        script: `
          Opening: Handbag on dark background (black or dark gray).
          Camera: 360-degree slow rotation on turntable.
          Lighting: Professional studio setup with key light and rim light.
          Speed: Slow motion at 50% normal playback (or 60 FPS slow mo).
          Music: Luxurious string orchestration, minimal tempo 70 BPM.
          Effect: Dramatic, sophisticated introduction.
          Voiceover (optional, whispered): "Timeless elegance in every detail."
          Focus: Complete silhouette, leather quality, overall design.
        `,
        movements: [
          'Handbag rotates 360 degrees (slow, 7-8 seconds)',
          'Stop at front view for 2 seconds',
          'Stop at side profile for 2 seconds',
          'Return to front, slight tilt up'
        ],
        cameraWork: 'Static camera, turntable rotation or circular dolly',
        lighting: 'Key light 45° right, rim light from back left, fill light subtle',
        musicDescription: 'Luxurious strings, 70 BPM, minimal, sophisticated',
        notes: 'Handbag must be perfectly lit to show leather sheen'
      },
      {
        number: 2,
        name: 'Material & Craftsmanship',
        duration: 8,
        timeCode: '0:07-0:15',
        script: `
          Close-up detailing of handbag features.
          Camera: Series of macro/close-up shots (50% slow motion).
          Angles: 
            - Leather texture and grain
            - Hardware detail (clasps, charms, zipper pulls)
            - Stitching quality and consistency
            - Interior fabric and organization compartments
            - Designer signature or branding
          Lighting: Bright, even light reveal leather depth and texture.
          Movement: Gentle hand interaction, opening/closing bag to show mechanism.
          Music: Continue luxe strings, tempo consistent.
          Voiceover (optional): "Crafted with precision from the finest materials."
        `,
        movements: [
          'Hand enters frame, touches leather surface slowly',
          'Finger traces stitching detail (5 seconds in slow mo)',
          'Gently opens clasp mechanism, shows ease',
          'Peeks inside, reveals organized compartments',
          'Closes gently, hand exits frame'
        ],
        cameraWork: 'Close-ups at 1-2 feet distance, macro if available',
        lighting: 'Bright even light with minimal shadows to show texture',
        musicDescription: 'Luxurious strings continue, 70 BPM',
        notes: 'This segment should make viewers want to touch the product'
      },
      {
        number: 3,
        name: 'Lifestyle & Elegance',
        duration: 5,
        timeCode: '0:15-0:20',
        script: `
          Handbag carried in real context: on shoulder, in hand, on table.
          Camera: Medium and wide shots (normal speed, no slow mo, return to 100%).
          Lighting: Slightly softer, more flattering studio lighting.
          Settings: Elegant minimal backdrop (light wall or neutral surface).
          Movement: Model carrying bag naturally, showing scale and proportions.
          Music: Building slightly, reaches peak at final shot.
          Final scene: Handbag resting on elegant surface (marble table, silk cloth).
          Feeling: Desire, aspiration, luxury purchase decision.
        `,
        movements: [
          'Place bag on shoulder, adjust strap (2 seconds)',
          'Walk slowly across frame showing on-body appearance (2 seconds)',
          'Set bag on table carefully, hand remains on it briefly',
          'Pull hand away slowly, reveal final positioned handbag'
        ],
        cameraWork: 'Medium shot as worn, close-up of final resting position',
        lighting: 'Softer than detail segment, flatter to show elegance',
        musicDescription: 'Luxurious strings, crescendo to peak, 70 BPM',
        notes: 'Show scale by having person hold/wear the bag'
      }
    ],
    productHighlights: [
      'Premium leather quality and texture',
      'Precision stitching and craftsmanship',
      'Luxury hardware and details',
      'Thoughtful interior organization',
      'Timeless design and elegance',
      'Perfect proportions and scale'
    ],
    setupRequirements: {
      location: 'Studio with controlled lighting',
      equipment: [
        'Professional camera (DSLR/mirrorless preferred)',
        'Macro lens (100mm or equivalent)',
        'Tripod and turntable',
        '3-light setup (key, rim, fill)',
        'Gimbal for movement shots'
      ],
      duration: '90 minutes setup + 45 minutes filming',
      setup: 'Professional studio with controlled environment',
      wardrobe: 'Elegant black or neutral clothing for lifestyle shots'
    },
    editingNotes: `
      - Color grade: Cool tones, slightly desaturated, high contrast
      - Transitions: Slow dissolves, no hard cuts (matches music)
      - Slow motion: Segments 1-2 at 50% speed, segment 3 at normal speed
      - Text overlays: Brand name in segment 1 (fades in at 1 sec), materials/details in segment 2, style name in segment 3
      - Music: Orchestral swell at intro, holds through segment 2, crescendo segment 3
      - Sound design: Subtle leather creak when opening/closing
      - Overall pace: Luxurious and slow, emphasize quality over quantity
    `
  },

  'shoes-athletic': {
    scenarioId: 'product-showcase',
    title: 'Athletic Shoes Feature',
    duration: 20,
    productType: 'Athletic Shoes',
    style: 'dynamic-energetic',
    segments: [
      {
        number: 1,
        name: 'Hero Shot',
        duration: 5,
        timeCode: '0:00-0:05',
        script: `
          Opening: Shoes displayed on textured surface (sneaker mat or styled background).
          Camera: Wide shot from above at 45-degree angle.
          Lighting: Bright, energetic lighting with color accents behind shoes.
          Movement: Smooth camera push-in, examining left shoe, slight rotation.
          Music: Modern upbeat hip-hop/electronic, 120 BPM energy.
          Effect: Modern, high-energy, tech-forward appeal.
          Voiceover (optional): "Step into performance. Step into [Brand]."
        `,
        movements: [
          'Push camera in slowly over 5 seconds',
          'Shoes rotate 90 degrees showing side profile midway'
        ],
        cameraWork: 'Wide shot overhead, smooth push-in from 2ft to 1ft',
        lighting: 'Bright top-light, colored accent light behind shoes (blue/purple)',
        musicDescription: 'Modern hip-hop/electronic, 120 BPM, energetic',
        notes: 'Shoes should be spotless and perfectly presented'
      },
      {
        number: 2,
        name: 'Tech Features Detail',
        duration: 9,
        timeCode: '0:05-0:14',
        script: `
          Showcase: Sole technology, cushioning, materials, color options.
          Camera: Series of dynamic angles showing different shoe features.
          Movements:
            - Flip shoe to show sole technology
            - Show cushioning material close-up
            - Pan across color options if available
            - Demonstrate flexibility (bend shoe slightly)
            - Highlight weight and materials
          Lighting: Bright studio light with accent light on details.
          Music: Maintain energetic tempo 120 BPM, add layered beats.
          Text overlays: Feature name appears as shown (e.g., "CloudComfort Cushioning").
          Focus: Tech advantage, performance benefit, material quality.
        `,
        movements: [
          'Flip shoe to show sole (2 seconds)',
          'Point to cushioning technology with finger',
          'Show flexibility by bending shoe gently',
          'Pan across other color options if 2-3 shoes available',
          'Press on sole to show response',
          'Flip back to show sleek silhouette'
        ],
        cameraWork: 'Close-ups with slight camera movement, multiple angles',
        lighting: 'Bright key light, accent light on sole details',
        musicDescription: 'Modern hip-hop/electronic, 120 BPM, layered beats',
        notes: 'Use text overlays to identify each feature as shown'
      },
      {
        number: 3,
        name: 'Action Performance',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          Action shots: Person wearing shoes in active movement.
          Camera: Dynamic angles following movement, action shot style.
          Movements: Running, jumping, quick lateral movements, stopping.
          Lighting: Natural outdoor light or bright gym lighting.
          Speed: Normal to 110% playback speed for dynamic feel.
          Music: Peak energy, tempo builds to 130 BPM.
          Effects: Possible motion blur emphasis on movement.
          Message: "Ready for anything you throw at them."
          Closing: Subject stops mid-stride, confident powerful stance.
        `,
        movements: [
          'Quick walk to running motion (2 seconds)',
          'Jump or lateral cut showing support (1.5 seconds)',
          'Sprint or burst of speed (1.5 second)',
          'Quick stop with power stance, look at camera confident'
        ],
        cameraWork: 'Following gimbal shot, dynamic angles, some wide to show movement',
        lighting: 'Natural outdoor or bright gym lighting',
        musicDescription: 'Modern hip-hop/electronic, 130 BPM, peak energy',
        notes: 'Film on concrete/court surface to show shoe grip'
      }
    ],
    productHighlights: [
      'Advanced cushioning technology',
      'Lightweight responsive sole',
      'Breathable mesh upper material',
      'Durable athletic construction',
      'Available in multiple color options',
      'Performance-tested and proven'
    ],
    setupRequirements: {
      location: 'Clean studio + outdoor running/athletic space',
      equipment: [
        'Camera/Phone with gimbal',
        'Studio setup for details (lights, backdrop)',
        'Athletic space for action shots'
      ],
      duration: '60-75 minutes total',
      setup: 'Mix of studio (30 min) and location shooting (30-45 min)',
      wardrobe: 'Athletic wear matching shoe aesthetic'
    },
    editingNotes: `
      - Color grade: Punchy, saturated, high contrast, warm skin tones
      - Transitions: Quick cuts on beat, match cuts to music tempo
      - Text overlays: Tech feature names appear as features shown, fade with music
      - Music: Build from intro to peak in segment 3, drops back down for final pose
      - Pacing: Fast, energetic, match cuts to beats (2-3 second clips, faster in segment 3)
      - Sound design: Footstep impacts, slight shoe creak when bending
      - Color accent: Consider slight blue or neon accent light in background
    `
  },

  'sunglasses-lifestyle': {
    scenarioId: 'fashion-flow',
    title: 'Sunglasses Lifestyle Story',
    duration: 20,
    productType: 'Sunglasses',
    style: 'smooth-cinematic',
    segments: [
      {
        number: 1,
        name: 'Styling Moment',
        duration: 7,
        timeCode: '0:00-0:07',
        script: `
          Scene: Person putting on sunglasses in stylish manner.
          Camera: Close-up on face/eyes (3-4 feet away) as sunglasses are applied.
          Lighting: Natural light, warm golden tone if outdoors.
          Movement: Slow, deliberate motion of bringing glasses to face.
          Music: Smooth, sophisticated indie/pop, 95 BPM.
          Effect: Instant style transformation.
          Voiceover (optional): "Elevate your style instantly."
          Focus: How sunglasses frame the face, instant style upgrade.
        `,
        movements: [
          'Sunglasses in hand, positioned below chin',
          'Slow motion lifting glasses up toward face (3-4 seconds)',
          'Place over eyes and adjust slightly',
          'Look away to side, then look toward camera',
          'Confident head tilt or nod'
        ],
        cameraWork: 'Close-up medium shot, slight push-in as glasses apply',
        lighting: 'Natural light, warm golden hour preferred',
        musicDescription: 'Smooth indie/pop, 95 BPM, sophisticated',
        notes: 'Capture the exact moment glasses are applied for style impact'
      },
      {
        number: 2,
        name: 'Style Details',
        duration: 7,
        timeCode: '0:07-0:14',
        script: `
          Closeup details: Frame design, lenses, hinge mechanism, branding.
          Camera: Extreme close-ups showing craftsmanship (macro if available).
          Angles: 
            - Frame side profile
            - Bridge detail and fit markers
            - Lens color and reflectivity
            - Hinge mechanism and quality
            - Logo or designer marking
          Lighting: Bright even light to show lens tint/color accurately.
          Movement: Rotate glasses slightly to show different angles.
          Music: Continue smooth tempo, slightly more layered.
          Voiceover (optional): "Crafted for style and eye protection."
        `,
        movements: [
          'Hold glasses at arm length, showcase profile (2 seconds)',
          'Rotate to show lens quality (2 seconds)',
          'Tilt to show bridge fit area (1.5 seconds)',
          'Bring closer to camera to show logo/branding',
          'Remove slowly, revealing face again'
        ],
        cameraWork: 'Macro or extreme close-up, detailed product photography',
        lighting: 'Bright even light with accent to show lens color',
        musicDescription: 'Smooth indie/pop continue, 95 BPM, layered',
        notes: 'Lens reflections add visual interest but avoid glare'
      },
      {
        number: 3,
        name: 'Lifestyle Confidence',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          Montage: Person wearing sunglasses in stylish settings.
          Camera: Multiple quick scenes, cinematic angles.
          Scenes: 
            - Walking confidently down street
            - Sitting at cafe or outdoor area
            - Looking over glasses with confident expression
            - Final shot: Direct camera gaze, confident smile
          Lighting: Mixed natural light, golden hour preferred.
          Movement: Natural, confident body language.
          Music: Builds to climax, tempo slight increase 100 BPM.
          Message: "This is who you are. This is your style."
          Feeling: Confidence, aspiration, elevated lifestyle.
        `,
        movements: [
          'Walk naturally down sidewalk (3 seconds)',
          'Arrive at sitting spot, sit with pose',
          'Brief head movement looking over glasses',
          'Look away pensively for moment',
          'Final look toward camera with confidence'
        ],
        cameraWork: 'Mix of wide shots and close-ups on face/glasses',
        lighting: 'Natural mixed light, golden hour optimal',
        musicDescription: 'Smooth indie/pop, 100 BPM, building confidence',
        notes: 'Emphasize attitude and confidence wearing the sunglasses'
      }
    ],
    productHighlights: [
      'Stylish frame design',
      'Premium lens material',
      'Comfortable fit and hinge quality',
      'UV eye protection',
      'Versatile style for any occasion',
      'Elevates any outfit instantly'
    ],
    setupRequirements: {
      location: 'Outdoor location + optional cafe/sitting area',
      equipment: ['Camera/Phone', 'Gimbal or stabilizer', 'Natural light sufficient'],
      duration: '45-60 minutes',
      setup: 'Outdoor location scouting, multiple sitting spots',
      wardrobe: 'Stylish casual outfit, neutral colors recommended'
    },
    editingNotes: `
      - Color grade: Warm, golden hour tones, slightly saturated
      - Transitions: Smooth dissolves between scenes
      - Text overlays: Brand/model in segment 1 (bottom right), features in segment 2 (technical specs), lifestyle tagline in segment 3
      - Music: Fade in smoothly, build through segments, fade out at end
      - Pacing: Moderate to slightly slower, emphasize lifestyle and attitude
      - Lens effects: Subtle lens reflection, avoid harsh flare
      - Sound: Subtle ambient city sounds, wind if outdoors
    `
  },

  // ================== VIETNAMESE REVIEW TEMPLATES ==================
  'review-boc-phot-nguoc': {
    scenarioId: 'review-boc-phot-nguoc',
    title: 'Review Bóc Phốt Ngược',
    duration: 20,
    productType: 'Any Product',
    style: 'dramatic-twist',
    segments: [
      {
        number: 1,
        name: 'Hook - Nghi Ngờ',
        duration: 3,
        timeCode: '0:00-0:03',
        script: `
          Mở đầu như bóc phốt: "Nghe đồn [sản phẩm] chỉ là quảng cáo?"
          Camera: Close-up mặt, biểu cảm nghi ngờ.
          Lighting: Tương phản nhẹ, tạo kịch tính.
          Movement: Nhướn mày, nhìn thẳng camera.
          Text overlay: "SỰ THẬT?" (1-2 từ).
        `,
        movements: [
          'Nhìn nghiêng sang trái 1 giây',
          'Quay lại nhìn thẳng camera, nhướn mày'
        ],
        cameraWork: 'Close-up, zoom in nhẹ',
        lighting: 'Key light hơi cứng, tạo bóng nhẹ',
        musicDescription: 'Căng thẳng nhẹ, 90 BPM',
        notes: 'Hook phải gọn và gây tò mò'
      },
      {
        number: 2,
        name: 'Test Thực Tế',
        duration: 10,
        timeCode: '0:03-0:13',
        script: `
          Thử nhanh 2-3 điểm chính: chất liệu, chi tiết, độ hoàn thiện.
          Camera: Cận cảnh tay và sản phẩm, lia chậm.
          Movement: Chỉ tay vào chi tiết, xoay sản phẩm.
          Text overlay: 1-2 keyword lợi ích.
        `,
        movements: [
          'Cầm sản phẩm ngang ngực, xoay 45 độ',
          'Chỉ vào chi tiết nổi bật',
          'Đưa gần camera để thấy texture'
        ],
        cameraWork: 'Close-up + pan chậm',
        lighting: 'Ánh sáng đều, thấy rõ texture',
        musicDescription: 'Nhịp đều, 100 BPM',
        notes: 'Tập trung bằng chứng trực quan'
      },
      {
        number: 3,
        name: 'Twist - Khen Thật',
        duration: 5,
        timeCode: '0:13-0:18',
        script: `
          Lật kèo: "Tôi tưởng bị lừa, nhưng thật sự đáng tiền."
          Camera: Mid-shot, biểu cảm gật đầu.
          Movement: Gật đầu nhẹ, cười.
        `,
        movements: [
          'Nhìn lại sản phẩm, gật đầu',
          'Quay lại camera, cười nhẹ'
        ],
        cameraWork: 'Mid-shot, ổn định',
        lighting: 'Mềm, thân thiện hơn',
        musicDescription: 'Tích cực hơn, 105 BPM',
        notes: 'Nhấn sự chuyển đổi cảm xúc'
      },
      {
        number: 4,
        name: 'CTA',
        duration: 2,
        timeCode: '0:18-0:20',
        script: `
          Kêu gọi: "Muốn biết thật hay giả, tự trải nghiệm nhé. Link bio."
          Camera: Close-up, ánh mắt trực diện.
        `,
        movements: [
          'Giơ tay chỉ xuống',
          'Nhìn thẳng camera'
        ],
        cameraWork: 'Close-up, giữ khung',
        lighting: 'Sáng rõ',
        musicDescription: 'Nhấn nhịp CTA',
        notes: 'CTA ngắn, dứt khoát'
      }
    ],
    productHighlights: [
      'Điểm mạnh bất ngờ',
      'Bằng chứng thực tế',
      'Twist tăng tin cậy'
    ],
    setupRequirements: {
      location: 'Studio hoặc góc phòng sạch',
      equipment: ['Camera/Phone', 'Tripod', '1 đèn key'],
      duration: '30-40 phút',
      setup: 'Gọn, nền sạch',
      wardrobe: 'Trang phục trung tính'
    },
    editingNotes: `
      - Cut nhanh ở hook, slow hơn ở phần test
      - Text overlay tối giản (1-2 từ)
      - Nhạc chuyển mood từ nghi ngờ → tin tưởng
    `
  },

  'review-chuyen-gia-ky-thuat': {
    scenarioId: 'review-chuyen-gia-ky-thuat',
    title: 'Review Chuyên Gia Kỹ Thuật',
    duration: 20,
    productType: 'Any Product',
    style: 'expert-analytical',
    segments: [
      {
        number: 1,
        name: 'Chuyên Gia Lên Tiếng',
        duration: 6,
        timeCode: '0:00-0:06',
        script: `
          Giới thiệu góc nhìn chuyên gia: "Đánh giá theo tiêu chuẩn [X]."
          Camera: Mid-shot, dáng đứng chắc chắn.
          Lighting: Studio sạch, chuyên nghiệp.
        `,
        movements: [
          'Đứng thẳng, tay cầm sản phẩm',
          'Gật nhẹ khi nêu tiêu chuẩn'
        ],
        cameraWork: 'Mid-shot, ổn định',
        lighting: 'Studio bright',
        musicDescription: 'Chuyên nghiệp, 95 BPM',
        notes: 'Tạo uy tín'
      },
      {
        number: 2,
        name: 'Phân Tích Kỹ Thuật',
        duration: 8,
        timeCode: '0:06-0:14',
        script: `
          Mổ xẻ cấu trúc, vật liệu, hiệu năng.
          Camera: Cận cảnh chi tiết, zoom chậm.
          Movement: Chỉ tay vào điểm kỹ thuật.
        `,
        movements: [
          'Xoay sản phẩm 90 độ',
          'Chỉ vào phần cấu trúc',
          'Đưa gần camera để thấy chi tiết'
        ],
        cameraWork: 'Close-up + zoom in',
        lighting: 'Rõ chi tiết, ít bóng',
        musicDescription: 'Nhịp đều, 100 BPM',
        notes: 'Nói rõ lý do kỹ thuật'
      },
      {
        number: 3,
        name: 'Kết Luận & CTA',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          Chốt: "Nếu cần [lợi ích], đây là lựa chọn đáng tin."
          Camera: Mid-shot, ánh mắt chắc chắn.
        `,
        movements: [
          'Gật đầu xác nhận',
          'Chỉ xuống CTA'
        ],
        cameraWork: 'Mid-shot, giữ khung',
        lighting: 'Sáng rõ, trung tính',
        musicDescription: 'Build nhẹ lên CTA',
        notes: 'Kết luận dứt khoát'
      }
    ],
    productHighlights: [
      'Thông số rõ ràng',
      'Chất liệu/ cấu trúc',
      'Hiệu năng được chứng minh'
    ],
    setupRequirements: {
      location: 'Studio/Office',
      equipment: ['Camera/Phone', 'Tripod', 'Đèn key + fill'],
      duration: '40-50 phút',
      setup: 'Bố cục gọn, chuyên nghiệp',
      wardrobe: 'Áo sơ mi/áo tối giản'
    },
    editingNotes: `
      - Overlay số liệu ngắn gọn
      - Tone màu trung tính, sạch
      - Cắt theo nhịp nói
    `
  },

  'review-nguoi-dung-thuc-te': {
    scenarioId: 'review-nguoi-dung-thuc-te',
    title: 'Review Người Dùng Thực Tế',
    duration: 20,
    productType: 'Any Product',
    style: 'authentic-story',
    segments: [
      {
        number: 1,
        name: 'Pain Point Đời Thật',
        duration: 5,
        timeCode: '0:00-0:05',
        script: `
          "Mình từng gặp vấn đề [pain point] mỗi ngày."
          Camera: Close-up mặt, cảm xúc thật.
        `,
        movements: [
          'Thở dài nhẹ',
          'Nhìn xuống sản phẩm rồi nhìn lên camera'
        ],
        cameraWork: 'Close-up, handheld nhẹ',
        lighting: 'Tự nhiên, mềm',
        musicDescription: 'Nhẹ nhàng, 90 BPM',
        notes: 'Tạo sự đồng cảm'
      },
      {
        number: 2,
        name: 'Trải Nghiệm',
        duration: 9,
        timeCode: '0:05-0:14',
        script: `
          "Sau khi dùng [sản phẩm], mình thấy..."
          Camera: Mid-shot + cận cảnh chi tiết.
        `,
        movements: [
          'Thử thao tác thực tế',
          'Chỉ vào điểm khác biệt'
        ],
        cameraWork: 'Mix mid-shot và close-up',
        lighting: 'Sáng đều, thân thiện',
        musicDescription: 'Ấm áp, 95 BPM',
        notes: 'Cảm giác trải nghiệm thật'
      },
      {
        number: 3,
        name: 'Kết Quả & CTA',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          "Nếu bạn giống mình, thử ngay nhé."
          Camera: Mid-shot, nụ cười thật.
        `,
        movements: [
          'Gật đầu nhẹ',
          'Chỉ xuống CTA'
        ],
        cameraWork: 'Mid-shot, giữ khung',
        lighting: 'Tự nhiên',
        musicDescription: 'Tăng nhịp CTA',
        notes: 'Chốt nhẹ nhàng, gần gũi'
      }
    ],
    productHighlights: [
      'Pain point giải quyết',
      'Cảm giác đời thật',
      'Kết quả cụ thể'
    ],
    setupRequirements: {
      location: 'Nhà/không gian đời sống',
      equipment: ['Camera/Phone', 'Ánh sáng tự nhiên'],
      duration: '30 phút',
      setup: 'Góc quay đời thường',
      wardrobe: 'Casual'
    },
    editingNotes: `
      - Giữ cảm giác tự nhiên
      - Cắt theo nhịp nói
      - Ít hiệu ứng
    `
  },

  'review-unboxing-can-canh': {
    scenarioId: 'review-unboxing-can-canh',
    title: 'Review Unboxing Cận Cảnh',
    duration: 20,
    productType: 'Any Product',
    style: 'premium-unboxing',
    segments: [
      {
        number: 1,
        name: 'Reveal Hộp',
        duration: 5,
        timeCode: '0:00-0:05',
        script: `
          Cận cảnh hộp, kéo seal chậm.
          Camera: Top-down hoặc 45 độ.
          Âm thanh mở hộp rõ.
        `,
        movements: [
          'Đặt tay lên hộp',
          'Kéo seal chậm'
        ],
        cameraWork: 'Top-down, close-up',
        lighting: 'Studio sáng đều',
        musicDescription: 'ASMR nhẹ, 80 BPM',
        notes: 'Tập trung cảm giác mở hộp'
      },
      {
        number: 2,
        name: 'Cận Cảnh Chi Tiết',
        duration: 9,
        timeCode: '0:05-0:14',
        script: `
          Cận cảnh chất liệu, bề mặt, phụ kiện.
          Camera: Macro, lia chậm.
        `,
        movements: [
          'Xoay sản phẩm chậm',
          'Chỉ vào điểm tinh xảo'
        ],
        cameraWork: 'Macro/close-up',
        lighting: 'Rim light nhẹ để nổi texture',
        musicDescription: 'Tinh tế, 85 BPM',
        notes: 'Nhấn premium'
      },
      {
        number: 3,
        name: 'First Touch & CTA',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          Chạm thử, cảm nhận.
          Kêu gọi: "Đáng tiền, link bio."
        `,
        movements: [
          'Chạm nhẹ bề mặt',
          'Ngẩng lên nhìn camera'
        ],
        cameraWork: 'Close-up → mid-shot',
        lighting: 'Mềm, sang',
        musicDescription: 'Tăng nhịp CTA',
        notes: 'Kết cảm giác sang trọng'
      }
    ],
    productHighlights: [
      'Bao bì đẹp',
      'Chi tiết tinh xảo',
      'Cảm giác premium'
    ],
    setupRequirements: {
      location: 'Studio/bàn sạch',
      equipment: ['Camera/Phone', 'Tripod', 'Đèn key'],
      duration: '30-40 phút',
      setup: 'Bàn sạch, nền tối giản',
      wardrobe: 'Tay áo tối giản'
    },
    editingNotes: `
      - Âm thanh mở hộp rõ
      - Slow motion cận cảnh
      - Grade sang, contrast nhẹ
    `
  },

  'problem-solution-3-buoc': {
    scenarioId: 'problem-solution-3-buoc',
    title: 'Problem → Solution 3 Bước',
    duration: 20,
    productType: 'Any Product',
    style: 'direct-conversion',
    segments: [
      {
        number: 1,
        name: 'Problem',
        duration: 5,
        timeCode: '0:00-0:05',
        script: `
          Nêu vấn đề ngắn gọn: "Bạn cũng gặp [pain point]?"
          Camera: Close-up, biểu cảm khó chịu.
        `,
        movements: [
          'Nhăn mặt nhẹ',
          'Nhìn thẳng camera'
        ],
        cameraWork: 'Close-up',
        lighting: 'Tương phản nhẹ',
        musicDescription: 'Hook nhanh, 100 BPM',
        notes: 'Vào vấn đề ngay'
      },
      {
        number: 2,
        name: 'Solution Test',
        duration: 9,
        timeCode: '0:05-0:14',
        script: `
          Thử giải pháp: "Mình test [sản phẩm] trong 5 giây."
          Camera: Mid-shot + cận cảnh thao tác.
        `,
        movements: [
          'Thao tác nhanh với sản phẩm',
          'Chỉ vào hiệu quả'
        ],
        cameraWork: 'Mid-shot, cut nhanh',
        lighting: 'Sáng rõ',
        musicDescription: 'Nhanh, 110 BPM',
        notes: 'Thấy kết quả rõ'
      },
      {
        number: 3,
        name: 'Result & CTA',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          "Xong! Nhẹ nhàng hơn hẳn."
          CTA: "Link bio."
        `,
        movements: [
          'Gật đầu xác nhận',
          'Chỉ CTA'
        ],
        cameraWork: 'Mid-shot',
        lighting: 'Tươi, tích cực',
        musicDescription: 'Chốt nhịp',
        notes: 'CTA dứt khoát'
      }
    ],
    productHighlights: [
      'Giải quyết pain point',
      'Nhanh, dễ làm',
      'Hiệu quả thấy ngay'
    ],
    setupRequirements: {
      location: 'Bất kỳ không gian gọn',
      equipment: ['Camera/Phone'],
      duration: '20-30 phút',
      setup: 'Tối giản',
      wardrobe: 'Casual'
    },
    editingNotes: `
      - Cut nhanh, nhịp dứt khoát
      - Text ngắn, rõ
    `
  },

  'before-after-transformation': {
    scenarioId: 'before-after-transformation',
    title: 'Before/After Transformation',
    duration: 20,
    productType: 'Any Product',
    style: 'proof-visual',
    segments: [
      {
        number: 1,
        name: 'Before',
        duration: 6,
        timeCode: '0:00-0:06',
        script: `
          Trước khi dùng: cảm giác chưa ổn, thiếu điểm nhấn.
          Camera: Full-body hoặc detail tùy sản phẩm.
        `,
        movements: [
          'Tư thế hơi thiếu tự tin',
          'Nhìn xuống sản phẩm'
        ],
        cameraWork: 'Wide hoặc close-up',
        lighting: 'Trung tính',
        musicDescription: 'Nhẹ, 90 BPM',
        notes: 'Tạo contrast cho After'
      },
      {
        number: 2,
        name: 'Transition',
        duration: 5,
        timeCode: '0:06-0:11',
        script: `
          Chuyển cảnh nhanh, show khoảnh khắc thay đổi.
          Camera: Quick cut hoặc swipe.
        `,
        movements: [
          'Xoay nhanh 90 độ',
          'Cử động tay tạo transition'
        ],
        cameraWork: 'Quick cut',
        lighting: 'Tăng sáng dần',
        musicDescription: 'Build lên, 100 BPM',
        notes: 'Tạo hiệu ứng wow'
      },
      {
        number: 3,
        name: 'After & CTA',
        duration: 9,
        timeCode: '0:11-0:20',
        script: `
          Sau khi dùng: tự tin, nổi bật.
          CTA: "Muốn hiệu ứng như vậy? Link bio."
        `,
        movements: [
          'Pose tự tin',
          'Nhìn thẳng camera'
        ],
        cameraWork: 'Mid-shot, ổn định',
        lighting: 'Sáng, tươi',
        musicDescription: 'Tích cực, 110 BPM',
        notes: 'Nhấn sự khác biệt'
      }
    ],
    productHighlights: [
      'Hiệu quả trực quan',
      'Cảm giác tự tin',
      'Chuyển đổi rõ rệt'
    ],
    setupRequirements: {
      location: 'Studio hoặc góc sạch',
      equipment: ['Camera/Phone', 'Tripod'],
      duration: '30 phút',
      setup: 'Dễ set up',
      wardrobe: 'Tối giản'
    },
    editingNotes: `
      - Dùng split-screen hoặc wipe
      - Tăng contrast ở After
    `
  },

  'kol-ai-persona-launch': {
    scenarioId: 'kol-ai-persona-launch',
    title: 'KOL AI Persona Launch',
    duration: 20,
    productType: 'Brand / Product',
    style: 'persona-branding',
    segments: [
      {
        number: 1,
        name: 'Persona Hook',
        duration: 6,
        timeCode: '0:00-0:06',
        script: `
          Giới thiệu persona: "Mình là [KOL AI], gu [style]."
          Camera: Close-up, ánh mắt tự tin.
        `,
        movements: [
          'Cười nhẹ',
          'Nhìn thẳng camera'
        ],
        cameraWork: 'Close-up',
        lighting: 'Soft, flattering',
        musicDescription: 'Trendy, 100 BPM',
        notes: 'Persona phải rõ nét'
      },
      {
        number: 2,
        name: 'Lifestyle Proof',
        duration: 8,
        timeCode: '0:06-0:14',
        script: `
          Lifestyle nhanh: outfit, hoạt động, cận sản phẩm.
          Camera: Mix wide + close-up.
        `,
        movements: [
          'Bước 2-3 bước',
          'Chỉ vào sản phẩm yêu thích'
        ],
        cameraWork: 'Mix shots',
        lighting: 'Tự nhiên',
        musicDescription: 'Năng lượng vừa phải',
        notes: 'Gắn sản phẩm với persona'
      },
      {
        number: 3,
        name: 'CTA Follow',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          "Follow để xem mình test thêm nhé."
          CTA: Link bio.
        `,
        movements: [
          'Gật đầu nhẹ',
          'Chỉ CTA'
        ],
        cameraWork: 'Mid-shot',
        lighting: 'Sáng rõ',
        musicDescription: 'Chốt nhẹ',
        notes: 'CTA theo dõi + mua'
      }
    ],
    productHighlights: [
      'Persona rõ cá tính',
      'Branding dài hạn',
      'Tăng độ tin cậy'
    ],
    setupRequirements: {
      location: 'Studio/lifestyle',
      equipment: ['Camera/Phone'],
      duration: '40 phút',
      setup: 'Tùy persona',
      wardrobe: 'Phù hợp persona'
    },
    editingNotes: `
      - Nhấn tên persona bằng text
      - Lưu ý consistency màu sắc
    `
  },

  'ai-tool-workflow-demo': {
    scenarioId: 'ai-tool-workflow-demo',
    title: 'AI Tool Workflow Demo',
    duration: 20,
    productType: 'AI Tool / SaaS',
    style: 'demo-fast',
    segments: [
      {
        number: 1,
        name: 'Result First',
        duration: 5,
        timeCode: '0:00-0:05',
        script: `
          Hiển thị kết quả: "Đây là output sau 30s."
          Camera: Cận màn hình/output.
        `,
        movements: [
          'Chỉ vào kết quả',
          'Gật đầu'
        ],
        cameraWork: 'Close-up',
        lighting: 'Sạch, sáng',
        musicDescription: 'Tech, 105 BPM',
        notes: 'Kết quả trước'
      },
      {
        number: 2,
        name: '3 Steps Demo',
        duration: 9,
        timeCode: '0:05-0:14',
        script: `
          Bước 1 input → Bước 2 chọn template → Bước 3 xuất output.
          Camera: Screen capture + tay thao tác.
        `,
        movements: [
          'Click thao tác nhanh',
          'Zoom nhẹ vào step quan trọng'
        ],
        cameraWork: 'Screen capture + zoom',
        lighting: 'Sáng đều',
        musicDescription: 'Nhanh, 115 BPM',
        notes: 'Tối giản thao tác'
      },
      {
        number: 3,
        name: 'CTA Trial',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          "Dùng thử miễn phí, link bio."
          Camera: Mid-shot, text CTA.
        `,
        movements: [
          'Chỉ xuống CTA',
          'Nhìn camera'
        ],
        cameraWork: 'Mid-shot',
        lighting: 'Sáng rõ',
        musicDescription: 'Chốt nhịp',
        notes: 'CTA rõ ràng'
      }
    ],
    productHighlights: [
      'Quy trình rõ ràng',
      'Tiết kiệm thời gian',
      'Kết quả nhanh'
    ],
    setupRequirements: {
      location: 'Bàn làm việc',
      equipment: ['Screen record', 'Camera/Phone'],
      duration: '30-40 phút',
      setup: 'Quay màn hình rõ',
      wardrobe: 'Casual/pro'
    },
    editingNotes: `
      - Highlight step labels
      - Dùng cursor highlight
    `
  },

  'ai-tool-strategy-pitch': {
    scenarioId: 'ai-tool-strategy-pitch',
    title: 'AI Tool Strategy Pitch',
    duration: 20,
    productType: 'AI System / Agency',
    style: 'strategy-pitch',
    segments: [
      {
        number: 1,
        name: 'Problem Hook',
        duration: 5,
        timeCode: '0:00-0:05',
        script: `
          "Bạn đang mất hàng giờ mỗi ngày vì [vấn đề]?"
          Camera: Close-up, câu hỏi trực diện.
        `,
        movements: [
          'Nhìn thẳng camera',
          'Nhấn mạnh bằng tay'
        ],
        cameraWork: 'Close-up',
        lighting: 'Tương phản nhẹ',
        musicDescription: 'Dứt khoát, 100 BPM',
        notes: 'Hook chiến lược'
      },
      {
        number: 2,
        name: 'System Pitch',
        duration: 9,
        timeCode: '0:05-0:14',
        script: `
          Giới thiệu hệ thống: input → automation → output.
          Camera: Mid-shot + overlay sơ đồ.
        `,
        movements: [
          'Chỉ vào sơ đồ',
          'Gật xác nhận'
        ],
        cameraWork: 'Mid-shot, overlay graphics',
        lighting: 'Chuyên nghiệp',
        musicDescription: 'Tech, 105 BPM',
        notes: 'Nhấn ROI'
      },
      {
        number: 3,
        name: 'CTA Demo',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          "Muốn demo hệ thống? Đặt lịch ngay."
          Camera: Mid-shot, CTA rõ.
        `,
        movements: [
          'Chỉ CTA',
          'Nhìn camera'
        ],
        cameraWork: 'Mid-shot',
        lighting: 'Sáng rõ',
        musicDescription: 'Chốt nhịp',
        notes: 'CTA B2B'
      }
    ],
    productHighlights: [
      'Giải pháp hệ thống',
      'ROI rõ ràng',
      'Tăng hiệu suất'
    ],
    setupRequirements: {
      location: 'Office/studio',
      equipment: ['Camera/Phone', 'Graphic overlay'],
      duration: '40 phút',
      setup: 'Bố cục chuyên nghiệp',
      wardrobe: 'Smart casual'
    },
    editingNotes: `
      - Overlay sơ đồ đơn giản
      - Tone màu corporate
    `
  },

  'kol-ai-dancing-outfit': {
    scenarioId: 'kol-ai-dancing-outfit',
    title: 'KOL AI Dancing Outfit Showcase',
    duration: 20,
    productType: 'Outfit',
    style: 'trend-dancing',
    segments: [
      {
        number: 1,
        name: 'Hook Dance Move',
        duration: 6,
        timeCode: '0:00-0:06',
        script: `
          Động tác nhảy mở màn theo trend, tập trung vào form quần áo khi chuyển động.
          Camera: Full-body, góc thấp nhẹ để tôn dáng.
          Lighting: Studio bright hoặc neon nhẹ.
        `,
        movements: [
          'Bước vào khung hình với động tác tay',
          'Nhún nhảy 2 nhịp theo beat'
        ],
        cameraWork: 'Wide shot, slight push-in',
        lighting: 'Sáng đều, tôn chất vải',
        musicDescription: 'Trend dance, 120 BPM',
        notes: 'Hook phải rõ ràng và bắt trend'
      },
      {
        number: 2,
        name: 'Form & Fabric Move',
        duration: 8,
        timeCode: '0:06-0:14',
        script: `
          Chuyển động chậm hơn để thấy độ rủ vải và form.
          Camera: Mid-shot + close-up chi tiết.
        `,
        movements: [
          'Xoay 180 độ chậm',
          'Lắc vai nhẹ để thấy độ rủ'
        ],
        cameraWork: 'Mid-shot, zoom in nhẹ',
        lighting: 'Soft light, highlight texture',
        musicDescription: 'Beat giảm nhẹ, 110 BPM',
        notes: 'Nhấn chất liệu và form'
      },
      {
        number: 3,
        name: 'CTA + Signature Move',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          Kết bằng signature move + CTA.
          Camera: Mid-shot, text CTA nhỏ.
        `,
        movements: [
          'Signature pose',
          'Chỉ CTA'
        ],
        cameraWork: 'Mid-shot, giữ khung',
        lighting: 'Sáng rõ',
        musicDescription: 'Chốt nhịp, 120 BPM',
        notes: 'CTA ngắn gọn'
      }
    ],
    productHighlights: [
      'Form đẹp khi chuyển động',
      'Chất vải có độ rủ',
      'Phong cách trend'
    ],
    setupRequirements: {
      location: 'Studio hoặc background trend',
      equipment: ['Camera/Phone', 'Tripod'],
      duration: '40 phút',
      setup: 'Nền sạch, ánh sáng đều',
      wardrobe: 'Outfit chính'
    },
    editingNotes: `
      - Cắt theo beat nhạc
      - Text overlay tối giản
      - Giữ nhịp nhanh
    `
  },

  'social-proof-ugc-montage': {
    scenarioId: 'social-proof-ugc-montage',
    title: 'Social Proof UGC Montage',
    duration: 20,
    productType: 'Any Product',
    style: 'ugc-fast',
    segments: [
      {
        number: 1,
        name: 'Hook Social Proof',
        duration: 5,
        timeCode: '0:00-0:05',
        script: `
          "Ai cũng đang dùng [sản phẩm] này!"
          Camera: Close-up, text highlight.
        `,
        movements: [
          'Nhìn camera, nhấn mạnh'
        ],
        cameraWork: 'Close-up',
        lighting: 'Sáng, tự nhiên',
        musicDescription: 'Nhanh, 115 BPM',
        notes: 'Hook social proof'
      },
      {
        number: 2,
        name: 'UGC Montage',
        duration: 9,
        timeCode: '0:05-0:14',
        script: `
          3-4 đoạn review nhanh (cắt nhanh).
          Camera: Mix shots khác nhau.
        `,
        movements: [
          'Cut nhanh 3-4 góc khác nhau'
        ],
        cameraWork: 'Quick cuts',
        lighting: 'Đa dạng nhưng sáng rõ',
        musicDescription: 'Nhanh, 120 BPM',
        notes: 'Tạo cảm giác nhiều người dùng'
      },
      {
        number: 3,
        name: 'CTA',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          "Thử ngay nhé, link bio!"
          Camera: Mid-shot.
        `,
        movements: [
          'Chỉ CTA',
          'Gật đầu'
        ],
        cameraWork: 'Mid-shot',
        lighting: 'Sáng rõ',
        musicDescription: 'Chốt nhịp',
        notes: 'CTA dứt khoát'
      }
    ],
    productHighlights: [
      'Niềm tin xã hội',
      'UGC chân thực',
      'Tính viral'
    ],
    setupRequirements: {
      location: 'Đa dạng góc quay',
      equipment: ['Camera/Phone'],
      duration: '30 phút',
      setup: 'Cắt nhiều footage',
      wardrobe: 'Casual'
    },
    editingNotes: `
      - Cắt nhanh, dùng text ngắn
      - Âm thanh review nổi bật
    `
  },

  'price-anchor-value-stack': {
    scenarioId: 'price-anchor-value-stack',
    title: 'Price Anchor + Value Stack',
    duration: 20,
    productType: 'Any Product',
    style: 'conversion',
    segments: [
      {
        number: 1,
        name: 'Anchor Value',
        duration: 6,
        timeCode: '0:00-0:06',
        script: `
          "Giá trị thị trường của [sản phẩm] thường là..."
          Camera: Close-up + text giá trị.
        `,
        movements: [
          'Nhìn camera, nhấn giá trị'
        ],
        cameraWork: 'Close-up',
        lighting: 'Sáng, rõ text',
        musicDescription: 'Dứt khoát, 105 BPM',
        notes: 'Tạo anchor'
      },
      {
        number: 2,
        name: 'Value Stack',
        duration: 8,
        timeCode: '0:06-0:14',
        script: `
          Liệt kê lợi ích/bonus.
          Camera: Mid-shot, overlay bullet.
        `,
        movements: [
          'Chỉ vào text overlay'
        ],
        cameraWork: 'Mid-shot',
        lighting: 'Sáng đều',
        musicDescription: 'Nhịp đều',
        notes: 'Tạo cảm giác hời'
      },
      {
        number: 3,
        name: 'Real Price + CTA',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          "Hôm nay chỉ còn [giá]. Link bio."
          Camera: Close-up.
        `,
        movements: [
          'Chỉ CTA',
          'Gật đầu'
        ],
        cameraWork: 'Close-up',
        lighting: 'Sáng rõ',
        musicDescription: 'Chốt nhịp',
        notes: 'CTA + urgency'
      }
    ],
    productHighlights: [
      'Giá trị rõ',
      'Ưu đãi hấp dẫn',
      'Tối ưu chuyển đổi'
    ],
    setupRequirements: {
      location: 'Studio/office',
      equipment: ['Camera/Phone'],
      duration: '30 phút',
      setup: 'Overlay text rõ',
      wardrobe: 'Smart casual'
    },
    editingNotes: `
      - Text giá trị/giá rõ ràng
      - Hiệu ứng number pop
    `
  },

  'countdown-deal-urgent': {
    scenarioId: 'countdown-deal-urgent',
    title: 'Countdown Deal Urgent',
    duration: 20,
    productType: 'Any Product',
    style: 'urgent-sale',
    segments: [
      {
        number: 1,
        name: 'Countdown Hook',
        duration: 5,
        timeCode: '0:00-0:05',
        script: `
          Hiển thị countdown + "Deal sắp hết!"
          Camera: Close-up.
        `,
        movements: [
          'Nhìn camera',
          'Nhấn tay vào countdown'
        ],
        cameraWork: 'Close-up',
        lighting: 'Sáng mạnh',
        musicDescription: 'Nhanh, 120 BPM',
        notes: 'Tạo urgency'
      },
      {
        number: 2,
        name: 'Deal Details',
        duration: 9,
        timeCode: '0:05-0:14',
        script: `
          Nêu lợi ích + giá ưu đãi.
          Camera: Mid-shot + overlay giá.
        `,
        movements: [
          'Chỉ giá ưu đãi',
          'Gật đầu'
        ],
        cameraWork: 'Mid-shot',
        lighting: 'Rõ text',
        musicDescription: 'Nhanh, 115 BPM',
        notes: 'Nhấn lợi ích'
      },
      {
        number: 3,
        name: 'CTA Urgent',
        duration: 6,
        timeCode: '0:14-0:20',
        script: `
          "Mua ngay trước khi hết!"
          Camera: Close-up.
        `,
        movements: [
          'Chỉ CTA',
          'Nhìn thẳng camera'
        ],
        cameraWork: 'Close-up',
        lighting: 'Sáng rõ',
        musicDescription: 'Chốt nhịp',
        notes: 'CTA mạnh'
      }
    ],
    productHighlights: [
      'Urgency cao',
      'Deal rõ',
      'Chốt nhanh'
    ],
    setupRequirements: {
      location: 'Studio/office',
      equipment: ['Camera/Phone'],
      duration: '25 phút',
      setup: 'Countdown overlay',
      wardrobe: 'Casual'
    },
    editingNotes: `
      - Countdown luôn hiện
      - Text đỏ/cam cho urgency
    `
  },

  'myth-vs-fact': {
    scenarioId: 'myth-vs-fact',
    title: 'Myth vs Fact',
    duration: 20,
    productType: 'Any Product',
    style: 'education',
    segments: [
      {
        number: 1,
        name: 'Myth Hook',
        duration: 6,
        timeCode: '0:00-0:06',
        script: `
          "Nhiều người nghĩ [myth] là đúng..."
          Camera: Close-up, biểu cảm nghi vấn.
        `,
        movements: [
          'Nhăn mày nhẹ',
          'Nhìn camera'
        ],
        cameraWork: 'Close-up',
        lighting: 'Tương phản nhẹ',
        musicDescription: 'Nhẹ, 95 BPM',
        notes: 'Nêu hiểu lầm'
      },
      {
        number: 2,
        name: 'Fact Proof',
        duration: 9,
        timeCode: '0:06-0:15',
        script: `
          Đưa ra sự thật + bằng chứng nhanh.
          Camera: Close-up + cận chi tiết sản phẩm.
        `,
        movements: [
          'Chỉ vào sản phẩm',
          'Xoay để show detail'
        ],
        cameraWork: 'Close-up',
        lighting: 'Sáng đều',
        musicDescription: 'Tích cực, 100 BPM',
        notes: 'Chứng minh nhanh'
      },
      {
        number: 3,
        name: 'CTA Trust',
        duration: 5,
        timeCode: '0:15-0:20',
        script: `
          "Giờ thì bạn biết rồi đó, thử ngay nhé."
          Camera: Mid-shot.
        `,
        movements: [
          'Gật đầu',
          'Chỉ CTA'
        ],
        cameraWork: 'Mid-shot',
        lighting: 'Sáng rõ',
        musicDescription: 'Chốt nhẹ',
        notes: 'Tăng trust'
      }
    ],
    productHighlights: [
      'Giải thích rõ',
      'Tăng niềm tin',
      'Phá hiểu lầm'
    ],
    setupRequirements: {
      location: 'Studio',
      equipment: ['Camera/Phone'],
      duration: '30 phút',
      setup: 'Nền sạch',
      wardrobe: 'Casual/pro'
    },
    editingNotes: `
      - Text Myth/Fact rõ ràng
      - Cắt gọn, tránh dài dòng
    `
  }
};

// EXPORT HELPER FUNCTIONS

/**
 * Get all templates for a specific scenario
 */
export function getTemplatesByScenario(scenarioId) {
  return Object.values(VIDEO_PRODUCTION_TEMPLATES).filter(
    t => t.scenarioId === scenarioId
  );
}

/**
 * Get all templates for a specific product type
 */
export function getTemplatesByProductType(productType) {
  return Object.values(VIDEO_PRODUCTION_TEMPLATES).filter(
    t => t.productType === productType
  );
}

/**
 * Search templates by title or keyword
 */
export function searchTemplates(keyword) {
  const lowerKeyword = keyword.toLowerCase();
  return Object.entries(VIDEO_PRODUCTION_TEMPLATES)
    .filter(([key, template]) =>
      template.title.toLowerCase().includes(lowerKeyword) ||
      template.productType.toLowerCase().includes(lowerKeyword) ||
      key.includes(lowerKeyword) ||
      template.segments.some(s => 
        s.script.toLowerCase().includes(lowerKeyword)
      )
    )
    .reduce((acc, [key, template]) => ({ ...acc, [key]: template }), {});
}

/**
 * Get template details by ID
 */
export function getTemplate(templateId) {
  return VIDEO_PRODUCTION_TEMPLATES[templateId];
}

/**
 * Get all template IDs and titles for quick reference
 */
export function getTemplateIndex() {
  return Object.entries(VIDEO_PRODUCTION_TEMPLATES).map(([id, template]) => ({
    id,
    title: template.title,
    productType: template.productType,
    scenarioId: template.scenarioId,
    duration: template.duration
  }));
}

/**
 * Format segment for display
 */
export function formatSegment(segment) {
  return {
    ...segment,
    scriptPlain: segment.script.replace(/\n\s+/g, ' ').trim()
  };
}

/**
 * Get segment by template and segment number
 */
export function getSegment(templateId, segmentNumber) {
  const template = VIDEO_PRODUCTION_TEMPLATES[templateId];
  if (!template) return null;
  return template.segments.find(s => s.number === segmentNumber);
}

export default VIDEO_PRODUCTION_TEMPLATES;
