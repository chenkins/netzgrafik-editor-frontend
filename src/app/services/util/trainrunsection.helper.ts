import {TrainrunSection} from "../../models/trainrunsection.model";
import {Node} from "../../models/node.model";
import {GeneralViewFunctions} from "../../view/util/generalViewFunctions";
import {
  LeftAndRightLockStructure,
  LeftAndRightTimeStructure,
} from "../../view/dialogs/trainrun-and-section-dialog/trainrunsection-tab/trainrun-section-tab.component";
import {MathUtils} from "../../utils/math";
import {TrainrunSectionText} from "../../data-structures/technical.data.structures";
import {TrainrunService} from "../data/trainrun.service";

export enum LeftAndRightElement {
  LeftDeparture,
  LeftArrival,
  RightDeparture,
  RightArrival,
  TravelTime,
  LeftRightTrainrunName,
  RightLeftTrainrunName,
}

export class TrainrunsectionHelper {
  constructor(private trainrunService: TrainrunService) {}

  static getSymmetricTime(time: number) {
    return time === 0 ? 0 : 60 - time;
  }

  static getDefaultTimeStructure(
    timeStructure: LeftAndRightTimeStructure,
  ): LeftAndRightTimeStructure {
    return {
      leftDepartureTime: timeStructure.leftDepartureTime,
      leftArrivalTime: timeStructure.leftArrivalTime,
      rightDepartureTime: 0,
      rightArrivalTime: 0,
      travelTime: 0,
    };
  }

  static getTravelTime(
    totalTravelTime: number,
    summedTravelTime: number,
    travelTimeFactor: number,
    trsTravelTime: number,
    isRightNodeNonStopTransit: boolean,
  ): number {
    if (isRightNodeNonStopTransit) {
      return Math.max(MathUtils.round(trsTravelTime * travelTimeFactor, 0), 1);
    } else {
      return Math.max(
        MathUtils.round(totalTravelTime - summedTravelTime, 0),
        1,
      );
    }
  }

  static getRightArrivalTime(timeStructure: LeftAndRightTimeStructure): number {
    return MathUtils.round(
      (timeStructure.leftDepartureTime + (timeStructure.travelTime % 60)) % 60,
      0,
    );
  }

  static getRightDepartureTime(
    timeStructure: LeftAndRightTimeStructure,
  ): number {
    return MathUtils.round(
      this.getSymmetricTime(timeStructure.rightArrivalTime),
      0,
    );
  }

  getLeftBetriebspunkt(
    trainrunSection: TrainrunSection,
    orderedNodes: Node[],
  ): string[] {
    const leftNode = this.getLeftNode(trainrunSection, orderedNodes);
    return [
      leftNode.getBetriebspunktName(),
      "(" + leftNode.getFullName() + ")",
    ];
  }

  getRightBetriebspunkt(
    trainrunSection: TrainrunSection,
    orderedNodes: Node[],
  ): string[] {
    const rightNode = this.getRightNode(trainrunSection, orderedNodes);
    return [
      rightNode.getBetriebspunktName(),
      "(" + rightNode.getFullName() + ")",
    ];
  }

  getSourceLock(
    lockStructure: LeftAndRightLockStructure,
    trainrunSection: TrainrunSection,
  ): boolean {
    const bothLastNonStopTransitNodes =
      this.trainrunService.getBothLastNonStopNodes(trainrunSection);
    const lastLeftNode = GeneralViewFunctions.getLeftOrTopNode(
      bothLastNonStopTransitNodes.lastNonStopNode1,
      bothLastNonStopTransitNodes.lastNonStopNode2,
    );
    return this.trainrunService
      .getLastNonStopNode(trainrunSection.getSourceNode(), trainrunSection)
      .getId() === lastLeftNode.getId()
      ? lockStructure.leftLock
      : lockStructure.rightLock;
  }

  getTargetLock(
    lockStructure: LeftAndRightLockStructure,
    trainrunSection: TrainrunSection,
  ): boolean {
    const bothLastNonStopNodes =
      this.trainrunService.getBothLastNonStopNodes(trainrunSection);
    const lastLeftNode = GeneralViewFunctions.getLeftOrTopNode(
      bothLastNonStopNodes.lastNonStopNode1,
      bothLastNonStopNodes.lastNonStopNode2,
    );
    return this.trainrunService
      .getLastNonStopNode(trainrunSection.getSourceNode(), trainrunSection)
      .getId() === lastLeftNode.getId()
      ? lockStructure.rightLock
      : lockStructure.leftLock;
  }

  getLeftAndRightLock(
    trainrunSection: TrainrunSection,
    orderedNodes: Node[],
  ): LeftAndRightLockStructure {
    const lastLeftNode = this.getLeftNode(trainrunSection, orderedNodes);
    const lastRightNode = this.getRightNode(trainrunSection, orderedNodes);

    return {
      leftLock:
        this.trainrunService
          .getLastNonStopNode(trainrunSection.getSourceNode(), trainrunSection)
          .getId() === lastLeftNode.getId()
          ? trainrunSection.getSourceArrivalLock() ||
            trainrunSection.getSourceDepartureLock()
          : trainrunSection.getTargetArrivalLock() ||
            trainrunSection.getTargetDepartureLock(),
      rightLock:
        this.trainrunService
          .getLastNonStopNode(trainrunSection.getSourceNode(), trainrunSection)
          .getId() === lastRightNode.getId()
          ? trainrunSection.getSourceArrivalLock() ||
            trainrunSection.getSourceDepartureLock()
          : trainrunSection.getTargetArrivalLock() ||
            trainrunSection.getTargetDepartureLock(),
      travelTimeLock: trainrunSection.getTravelTimeLock(),
    };
  }

  mapSelectedTimeElement(
    trainrunSectionSelectedText: TrainrunSectionText,
    trainrunSection: TrainrunSection,
    orderedNodes: Node[],
    forward: boolean,
  ): LeftAndRightElement | undefined {
    const leftNode = this.getLeftNode(trainrunSection, orderedNodes);
    const sourceNodeid = trainrunSection.getSourceNode().getId();
    const targetNodeid = trainrunSection.getTargetNode().getId();

    switch (trainrunSectionSelectedText) {
      case TrainrunSectionText.SourceDeparture:
        return sourceNodeid === leftNode.getId()
          ? LeftAndRightElement.LeftDeparture
          : LeftAndRightElement.RightDeparture;

      case TrainrunSectionText.SourceArrival:
        return sourceNodeid === leftNode.getId()
          ? LeftAndRightElement.LeftArrival
          : LeftAndRightElement.RightArrival;

      case TrainrunSectionText.TargetDeparture:
        return targetNodeid === leftNode.getId()
          ? LeftAndRightElement.LeftDeparture
          : LeftAndRightElement.RightDeparture;

      case TrainrunSectionText.TargetArrival:
        return targetNodeid === leftNode.getId()
          ? LeftAndRightElement.LeftArrival
          : LeftAndRightElement.RightArrival;

      case TrainrunSectionText.TrainrunSectionName:
        if (forward === undefined) {
          return leftNode.getId()
            ? LeftAndRightElement.LeftRightTrainrunName
            : LeftAndRightElement.RightLeftTrainrunName;
        }
        return sourceNodeid === leftNode.getId()
          ? forward
            ? LeftAndRightElement.LeftRightTrainrunName
            : LeftAndRightElement.RightLeftTrainrunName
          : forward
            ? LeftAndRightElement.RightLeftTrainrunName
            : LeftAndRightElement.LeftRightTrainrunName;

      case TrainrunSectionText.TrainrunSectionTravelTime:
        return LeftAndRightElement.TravelTime;
    }
    return undefined;
  }

  mapLeftAndRightTimes(
    trainrunSection: TrainrunSection,
    orderedNodes: Node[],
    timeStructure: LeftAndRightTimeStructure,
  ): LeftAndRightTimeStructure {
    const bothLastNonStopNodes =
      this.trainrunService.getBothLastNonStopNodes(trainrunSection);
    const leftNode = GeneralViewFunctions.getLeftOrTopNode(
      bothLastNonStopNodes.lastNonStopNode1,
      bothLastNonStopNodes.lastNonStopNode2,
    );
    const localLeftNode = this.getLeftNode(trainrunSection, orderedNodes);
    if (leftNode.getId() !== localLeftNode.getId()) {
      console.log("remap timeStructure", leftNode, localLeftNode);
      const mappedTimeStructure =
        TrainrunsectionHelper.getDefaultTimeStructure(timeStructure);
      mappedTimeStructure.rightArrivalTime = timeStructure.leftArrivalTime;
      mappedTimeStructure.leftArrivalTime = timeStructure.rightArrivalTime;
      mappedTimeStructure.rightDepartureTime = timeStructure.leftDepartureTime;
      mappedTimeStructure.leftDepartureTime = timeStructure.rightDepartureTime;
      mappedTimeStructure.travelTime = timeStructure.travelTime;
      return mappedTimeStructure;
    }
    return timeStructure;
  }

  getLeftAndRightTimes(
    trainrunSection: TrainrunSection,
    orderedNodes: Node[],
  ): LeftAndRightTimeStructure {
    const bothLastNonStopNodes =
      this.trainrunService.getBothLastNonStopNodes(trainrunSection);
    const bothLastNonStopTrainrunSections =
      this.trainrunService.getBothLastNonStopTrainrunSections(trainrunSection);
    const lastLeftNode = this.getLeftNode(trainrunSection, orderedNodes);
    const lastRightNode = this.getRightNode(trainrunSection, orderedNodes);

    const leftTrainrunSection =
      lastLeftNode.getId() === bothLastNonStopNodes.lastNonStopNode1.getId()
        ? bothLastNonStopTrainrunSections.lastNonStopTrainrunSection1
        : bothLastNonStopTrainrunSections.lastNonStopTrainrunSection2;
    const rightTrainrunSection =
      lastRightNode.getId() === bothLastNonStopNodes.lastNonStopNode1.getId()
        ? bothLastNonStopTrainrunSections.lastNonStopTrainrunSection1
        : bothLastNonStopTrainrunSections.lastNonStopTrainrunSection2;
    const cumulativeTravelTime =
      this.trainrunService.getCumulativeTravelTime(trainrunSection);

    return {
      leftDepartureTime: lastLeftNode.getDepartureTime(leftTrainrunSection),
      leftArrivalTime: lastLeftNode.getArrivalTime(leftTrainrunSection),
      rightDepartureTime: lastRightNode.getDepartureTime(rightTrainrunSection),
      rightArrivalTime: lastRightNode.getArrivalTime(rightTrainrunSection),
      travelTime: cumulativeTravelTime,
    };
  }

  getLeftNode(trainrunSection: TrainrunSection, orderedNodes: Node[]): Node {
    const bothLastNonStopNodes =
      this.trainrunService.getBothLastNonStopNodes(trainrunSection);
    const bothNodesFound =
      orderedNodes.find(
        (n: Node) =>
          n.getId() === bothLastNonStopNodes.lastNonStopNode1.getId(),
      ) !== undefined &&
      orderedNodes.find(
        (n: Node) =>
          n.getId() === bothLastNonStopNodes.lastNonStopNode2.getId(),
      ) !== undefined;
    let leftNode;
    if (!bothNodesFound) {
      leftNode = GeneralViewFunctions.getLeftOrTopNode(
        bothLastNonStopNodes.lastNonStopNode1,
        bothLastNonStopNodes.lastNonStopNode2,
      );
    } else {
      leftNode = GeneralViewFunctions.getLeftNodeAccordingToOrder(
        orderedNodes,
        bothLastNonStopNodes.lastNonStopNode1,
        bothLastNonStopNodes.lastNonStopNode2,
      );
    }
    return leftNode;
  }

  getRightNode(trainrunSection: TrainrunSection, orderedNodes: Node[]): Node {
    const bothLastNonStopNodes =
      this.trainrunService.getBothLastNonStopNodes(trainrunSection);
    const bothNodesFound =
      orderedNodes.find(
        (n: Node) =>
          n.getId() === bothLastNonStopNodes.lastNonStopNode1.getId(),
      ) !== undefined &&
      orderedNodes.find(
        (n: Node) =>
          n.getId() === bothLastNonStopNodes.lastNonStopNode2.getId(),
      ) !== undefined;
    let rightNode;
    if (!bothNodesFound) {
      rightNode = GeneralViewFunctions.getRightOrBottomNode(
        bothLastNonStopNodes.lastNonStopNode1,
        bothLastNonStopNodes.lastNonStopNode2,
      );
    } else {
      rightNode = GeneralViewFunctions.getRightNodeAccordingToOrder(
        orderedNodes,
        bothLastNonStopNodes.lastNonStopNode1,
        bothLastNonStopNodes.lastNonStopNode2,
      );
    }
    return rightNode;
  }
}