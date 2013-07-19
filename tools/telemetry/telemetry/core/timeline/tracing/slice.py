# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import telemetry.core.timeline.event as timeline_event

class Slice(timeline_event.TimelineEvent):
  ''' A Slice represents an interval of time plus parameters associated
  with that interval.

  NOTE: The Sample class implements the same interface as
  Slice. These must be kept in sync.

  All time units are stored in milliseconds.
  '''
  def __init__(self, category, name, timestamp, args=None, parent=None):
    super(Slice, self).__init__(
        name, timestamp, 0, args=args, parent=parent)
    self._sub_slices = []
    self.category = category
    self.did_not_finish = False

  @property
  def sub_slices(self):
    return self._sub_slices

  def AddSubSlice(self, sub_slice):
    self._sub_slices.append(sub_slice)

  def _GetSubSlicesRecursive(self):
    for sub_slice in self._sub_slices:
      for s in sub_slice.GetAllSubSlices():
        yield s
      yield sub_slice

  def GetAllSubSlices(self):
    return list(self._GetSubSlicesRecursive())

  def GetAllSubSlicesOfName(self, name):
    return [e for e in self.GetAllSubSlices() if e.name == name]
