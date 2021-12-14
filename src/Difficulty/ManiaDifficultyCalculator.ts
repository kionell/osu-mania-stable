import {
  DifficultyAttributes,
  DifficultyCalculator,
  IBeatmap,
  IMod,
  IRuleset,
  ModBitwise,
  ModCombination,
  Skill,
} from 'osu-classes';

import {
  ManiaDoubleTime,
  ManiaDualStages,
  ManiaEasy,
  ManiaHalfTime,
  ManiaHardRock,
  ManiaKey1,
  ManiaKey2,
  ManiaKey3,
  ManiaKey4,
  ManiaKey5,
  ManiaKey6,
  ManiaKey7,
  ManiaKey8,
  ManiaKey9,
} from '../Mods';

import { ManiaBeatmap } from '../Beatmaps';
import { ManiaHitObject } from '../Objects';
import { ManiaHitWindows } from '../Scoring';
import { ManiaDifficultyAttributes } from './Attributes';
import { ManiaDifficultyHitObject } from './Preprocessing';
import { Strain } from './Skills';
import { SortHelper } from './Utils';

export class ManiaDifficultyCalculator extends DifficultyCalculator {
  private static _STAR_SCALING_FACTOR = 0.018;

  private readonly _isForCurrentRuleset: boolean;
  private readonly _originalOverallDifficulty: number;

  constructor(beatmap: IBeatmap, ruleset: IRuleset) {
    super(beatmap, ruleset);

    this._isForCurrentRuleset = beatmap.originalMode === ruleset.id;
    this._originalOverallDifficulty = beatmap.difficulty.overallDifficulty;
  }

  protected _createDifficultyAttributes(beatmap: IBeatmap, mods: ModCombination, skills: Skill[]): DifficultyAttributes {
    if (beatmap.hitObjects.length === 0) {
      return new ManiaDifficultyAttributes(mods, 0);
    }

    const clockRate = beatmap.difficulty.clockRate;

    const hitWindows = new ManiaHitWindows();

    hitWindows.setDifficulty(beatmap.difficulty.overallDifficulty);

    const starRating = skills[0].difficultyValue * ManiaDifficultyCalculator._STAR_SCALING_FACTOR;

    const attributes = new ManiaDifficultyAttributes(mods, starRating);

    attributes.mods = mods;
    attributes.greatHitWindow = Math.ceil(this._getHitWindow300(mods) / clockRate);
    attributes.scoreMultiplier = mods.multiplier;
    attributes.maxCombo = (beatmap as ManiaBeatmap).maxCombo;

    return attributes;
  }

  protected *_createDifficultyHitObjects(beatmap: IBeatmap): Generator<ManiaDifficultyHitObject> {
    const clockRate = beatmap.difficulty.clockRate;
    const hitObjects = beatmap.hitObjects.slice() as ManiaHitObject[];

    const comparerFn = (a: ManiaHitObject, b: ManiaHitObject) => {
      return Math.trunc(Math.round(a.startTime)) - Math.trunc(Math.round(b.startTime));
    };

    const sortedObjects = SortHelper.sort(hitObjects, comparerFn);

    for (let i = 1; i < sortedObjects.length; ++i) {
      yield new ManiaDifficultyHitObject(sortedObjects[i], sortedObjects[i - 1], clockRate);
    }
  }

  protected _createSkills(beatmap: IBeatmap, mods: ModCombination): Skill[] {
    return [
      new Strain(mods, (beatmap as ManiaBeatmap).totalColumns),
    ];
  }

  get difficultyMods(): IMod[] {
    return [
      new ManiaDoubleTime(),
      new ManiaHalfTime(),
      new ManiaEasy(),
      new ManiaHardRock(),
      new ManiaKey1(),
      new ManiaKey2(),
      new ManiaKey3(),
      new ManiaKey4(),

      /**
       * If we are a convert, we can be played in any key mod.
       */
      new ManiaKey5(),
      new ManiaKey6(),
      new ManiaKey7(),
      new ManiaKey8(),
      new ManiaKey9(),
      new ManiaDualStages(),
    ];
  }

  private _getHitWindow300(mods: ModCombination): number {
    const applyModAdjustments = (value: number) => {
      if (mods.has(ModBitwise.HardRock)) {
        value /= 1.4;
      }
      else if (mods.has(ModBitwise.Easy)) {
        value *= 1.4;
      }

      if (mods.has(ModBitwise.DoubleTime)) {
        value *= 1.5;
      }
      else if (mods.has(ModBitwise.HalfTime)) {
        value *= 0.75;
      }

      return Math.trunc(value);
    };

    if (this._isForCurrentRuleset) {
      const od = Math.min(10, Math.max(0, 10 - this._originalOverallDifficulty));

      return applyModAdjustments(34 + 3 * od);
    }

    if (Math.round(this._originalOverallDifficulty) > 4) {
      return applyModAdjustments(34);
    }

    return applyModAdjustments(47);
  }

  private _getScoreMultiplier(mods: ModCombination) {
    let scoreMultiplier = 1;

    if (mods.has(ModBitwise.NoFail | ModBitwise.Easy | ModBitwise.HalfTime)) {
      scoreMultiplier *= 0.5;
    }

    const maniaBeatmap = this._beatmap as ManiaBeatmap;

    const diff = maniaBeatmap.totalColumns - maniaBeatmap.originalTotalColumns;

    if (diff > 0) {
      scoreMultiplier *= 0.9;
    }
    else if (diff < 0) {
      scoreMultiplier *= 0.9 + 0.04 * diff;
    }

    return scoreMultiplier;
  }
}