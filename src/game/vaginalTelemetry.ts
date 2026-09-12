import { VaginalTelemetry } from '../types';

export function getVaginalTelemetry(playerX: number): VaginalTelemetry {
  const x = playerX;

  if (x < -200) {
    // Inside the penile urethra / fossa navicularis
    return {
      currentSegment: 'Penile Urethra & Fossa Navicularis (Emission Origin)',
      anatomicalDescription:
        'The distal penile urethra terminating at the external urethral meatus. Rhythmic bulbospongiosus contractions expel seminal fluid containing 250,000,000 sperm bathed in alkaline seminal vesicle & prostatic secretions.',
      phLevel: 7.6,
      phZone: 'alkaline_mucus',
      temperature: 36.6,
      mucusViscosity: '1.2 mPa·s (High-Velocity Seminal Propulsion)',
      lactobacillusDensity: 'Sterile Urethral Lumen • Prostatic Zinc & Lysozyme Shield',
      glycogenLactateRate: 'Prostatic citric acid & fructose metabolic energy pool',
      tissueLayer: 'Pseudostratified Columnar to Stratified Squamous Urethral Mucosa',
      distanceFromIntroitus: Math.round(x),
      distanceToCervix: Math.round(1600 - x),
      inVaginalTract: false,
    };
  }

  if (x < 50) {
    // Ejaculating out of meatus and traversing the vestibule into introitus
    const progress = Math.max(0, Math.min(1, (x + 200) / 250));
    const ph = +(7.5 - progress * 1.5).toFixed(2);
    return {
      currentSegment: 'External Urethral Meatus → Insemination Site (Breaching Introitus)',
      anatomicalDescription:
        'High-velocity seminal fluid jets emerge from the urethral opening of the glans penis, crossing the lubricated vulvar vestibule and penetrating the elastic sphincter ring of the vaginal introitus.',
      phLevel: ph,
      phZone: 'neutralized_pool',
      temperature: 36.8,
      mucusViscosity: '1.8 mPa·s (Seminal Jet Stream into Vestibular Transudate)',
      lactobacillusDensity: 'Interface Transition • Alkaline Seminal Buffer shields against acids',
      glycogenLactateRate: 'High fructose fuel & spermine alkaline buffering',
      tissueLayer: 'External Vulvar Mucosa & Elastic Hymenal Caruncles Sphincter',
      distanceFromIntroitus: Math.round(x),
      distanceToCervix: Math.round(1600 - x),
      inVaginalTract: x >= 0,
    };
  }

  if (x < 220) {
    const progress = Math.max(0, Math.min(1, x / 220));
    const ph = +(4.8 - progress * 0.7).toFixed(2);
    return {
      currentSegment: 'Vulvar Vestibule & Vaginal Introitus',
      anatomicalDescription:
        'The primary anatomical entrance to the female reproductive tract, flanked by the labia minora and lubricated by secretions from the Greater Vestibular (Bartholin) and Skene glands.',
      phLevel: ph,
      phZone: 'acidic_mantle',
      temperature: 36.8,
      mucusViscosity: '2.1 mPa·s (Transudate Lubrication Film)',
      lactobacillusDensity: 'Moderate • Commensal Cutaneous to Mucosal Transition',
      glycogenLactateRate: '0.45 mmol/h lactic acid synthesis',
      tissueLayer: 'Non-Keratinized Stratified Squamous Mucosa over Dense Lamina Propria',
      distanceFromIntroitus: Math.round(x),
      distanceToCervix: Math.max(0, Math.round(1600 - x)),
      inVaginalTract: true,
    };
  }

  if (x < 1180) {
    // Inside the main vaginal canal
    const canalFactor = Math.sin(x * 0.015);
    const ph = +(3.85 + canalFactor * 0.15).toFixed(2);
    return {
      currentSegment: 'Vaginal Canal Lumen • Transverse Rugae Ridges',
      anatomicalDescription:
        'Distensible fibro-muscular canal featuring transverse epithelial ridges (columna rugarum) that harbor dense symbiotic Lactobacillus crispatus colonies, producing a hostile acidic barrier (pH 3.8-4.2).',
      phLevel: ph,
      phZone: 'acidic_mantle',
      temperature: 37.0,
      mucusViscosity: '3.6 mPa·s (High Viscous Resistance)',
      lactobacillusDensity: 'Ultra-Dense • 10⁸ CFU/g Lactobacillus crispatus & jensenii',
      glycogenLactateRate: '1.92 mmol/h active D/L-lactic acid conversion',
      tissueLayer: 'Glycogen-rich Stratified Squamous Epithelium (4 Distinct Cellular Layers)',
      distanceFromIntroitus: Math.round(x),
      distanceToCervix: Math.max(0, Math.round(1600 - x)),
      inVaginalTract: true,
    };
  }

  if (x < 1620) {
    // Posterior Fornix (The Seminal Reservoir at the back of the vagina)
    const fornixProgress = (x - 1180) / (1620 - 1180);
    const ph = +(4.2 + fornixProgress * 3.0).toFixed(2); // climbing from 4.2 to 7.2
    return {
      currentSegment: 'Posterior Fornix Vault • Seminal Pool (Receptaculum Seminis)',
      anatomicalDescription:
        'The deep recesses of the vaginal vault encircling the cervix. Seminal plasma collects here to form a protective alkaline buffer that neutralizes vaginal acids and fuels sperm motility.',
      phLevel: Math.min(7.25, ph),
      phZone: 'neutralized_pool',
      temperature: 37.1,
      mucusViscosity: '1.7 mPa·s (Enzymatically Liquefied by Seminal PSA)',
      lactobacillusDensity: 'Acidic biofilm suppressed by alkaline seminal buffer (pH ~7.2)',
      glycogenLactateRate: 'Buffered by spermine, spermidine & seminal bicarbonate',
      tissueLayer: 'Fornical Vault Mucosa directly beneath the Ectocervical Portio',
      distanceFromIntroitus: Math.round(x),
      distanceToCervix: Math.max(0, Math.round(1600 - x)),
      inVaginalTract: true,
    };
  }

  // Beyond vagina: External Cervical Os and Upper Tract
  return {
    currentSegment: 'External Cervical Os • Squamocolumnar Transformation Zone',
    anatomicalDescription:
      'The anatomical gateway separating the vaginal canal from the uterine cavity, guarded by parallel micellar glycoprotein chains of fertile cervical mucus (Spinnbarkeit).',
    phLevel: 7.5,
    phZone: 'alkaline_mucus',
    temperature: 37.2,
    mucusViscosity: 'Variable (Micro-filtration Mucus Crypts)',
    lactobacillusDensity: 'Sterile Upper Tract Interface • Endocervical Lysozymes',
    glycogenLactateRate: 'Estrogenic secretoglobin & mucin glycoprotein synthesis',
    tissueLayer: 'Simple Tall Columnar Mucus-Secreting Epithelium with Ciliated Cells',
    distanceFromIntroitus: Math.round(x),
    distanceToCervix: 0,
    inVaginalTract: false,
  };
}
