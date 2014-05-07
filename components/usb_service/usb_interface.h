// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef COMPONENTS_USB_SERVICE_USB_INTERFACE_H_
#define COMPONENTS_USB_SERVICE_USB_INTERFACE_H_

#include "base/memory/ref_counted.h"
#include "components/usb_service/usb_service_export.h"

struct libusb_config_descriptor;
struct libusb_endpoint_descriptor;
struct libusb_interface;
struct libusb_interface_descriptor;

namespace usb_service {

typedef libusb_config_descriptor* PlatformUsbConfigDescriptor;
typedef const libusb_endpoint_descriptor* PlatformUsbEndpointDescriptor;
typedef const libusb_interface* PlatformUsbInterface;
typedef const libusb_interface_descriptor* PlatformUsbInterfaceDescriptor;

enum UsbTransferType {
  USB_TRANSFER_CONTROL = 0,
  USB_TRANSFER_ISOCHRONOUS,
  USB_TRANSFER_BULK,
  USB_TRANSFER_INTERRUPT,
};

enum UsbEndpointDirection {
  USB_DIRECTION_INBOUND = 0,
  USB_DIRECTION_OUTBOUND,
};

enum UsbSynchronizationType {
  USB_SYNCHRONIZATION_NONE = 0,
  USB_SYNCHRONIZATION_ASYNCHRONOUS,
  USB_SYNCHRONIZATION_ADAPTIVE,
  USB_SYNCHRONIZATION_SYNCHRONOUS,
};

enum UsbUsageType {
  USB_USAGE_DATA = 0,
  USB_USAGE_FEEDBACK,
  USB_USAGE_EXPLICIT_FEEDBACK
};

class UsbDevice;
class UsbConfigDescriptor;
class UsbInterfaceDescriptor;
class UsbInterfaceAltSettingDescriptor;

class USB_SERVICE_EXPORT UsbEndpointDescriptor
    : public base::RefCounted<const UsbEndpointDescriptor> {
 public:
  int GetAddress() const;
  UsbEndpointDirection GetDirection() const;
  int GetMaximumPacketSize() const;
  UsbSynchronizationType GetSynchronizationType() const;
  UsbTransferType GetTransferType() const;
  UsbUsageType GetUsageType() const;
  int GetPollingInterval() const;

 private:
  friend class base::RefCounted<const UsbEndpointDescriptor>;
  friend class UsbInterfaceAltSettingDescriptor;

  UsbEndpointDescriptor(scoped_refptr<const UsbConfigDescriptor> config,
                        PlatformUsbEndpointDescriptor descriptor);
  ~UsbEndpointDescriptor();

  scoped_refptr<const UsbConfigDescriptor> config_;
  PlatformUsbEndpointDescriptor descriptor_;

  DISALLOW_COPY_AND_ASSIGN(UsbEndpointDescriptor);
};

class USB_SERVICE_EXPORT UsbInterfaceAltSettingDescriptor
    : public base::RefCounted<const UsbInterfaceAltSettingDescriptor> {
 public:
  size_t GetNumEndpoints() const;
  scoped_refptr<const UsbEndpointDescriptor> GetEndpoint(size_t index) const;

  int GetInterfaceNumber() const;
  int GetAlternateSetting() const;
  int GetInterfaceClass() const;
  int GetInterfaceSubclass() const;
  int GetInterfaceProtocol() const;

 private:
  friend class base::RefCounted<const UsbInterfaceAltSettingDescriptor>;
  friend class UsbInterfaceDescriptor;

  UsbInterfaceAltSettingDescriptor(
      scoped_refptr<const UsbConfigDescriptor> config,
      PlatformUsbInterfaceDescriptor descriptor);
  ~UsbInterfaceAltSettingDescriptor();

  scoped_refptr<const UsbConfigDescriptor> config_;
  PlatformUsbInterfaceDescriptor descriptor_;

  DISALLOW_COPY_AND_ASSIGN(UsbInterfaceAltSettingDescriptor);
};

class USB_SERVICE_EXPORT UsbInterfaceDescriptor
    : public base::RefCounted<const UsbInterfaceDescriptor> {
 public:
  size_t GetNumAltSettings() const;
  scoped_refptr<const UsbInterfaceAltSettingDescriptor> GetAltSetting(
      size_t index) const;

 private:
  friend class base::RefCounted<const UsbInterfaceDescriptor>;
  friend class UsbConfigDescriptor;

  UsbInterfaceDescriptor(scoped_refptr<const UsbConfigDescriptor> config,
                         PlatformUsbInterface usbInterface);
  ~UsbInterfaceDescriptor();

  scoped_refptr<const UsbConfigDescriptor> config_;
  PlatformUsbInterface interface_;

  DISALLOW_COPY_AND_ASSIGN(UsbInterfaceDescriptor);
};

class USB_SERVICE_EXPORT UsbConfigDescriptor
    : public base::RefCounted<UsbConfigDescriptor> {
 public:
  virtual size_t GetNumInterfaces() const;
  virtual scoped_refptr<const UsbInterfaceDescriptor> GetInterface(
      size_t index) const;

 protected:
  // Constructor called in test only
  UsbConfigDescriptor();
  virtual ~UsbConfigDescriptor();

 private:
  friend class base::RefCounted<UsbConfigDescriptor>;
  friend class UsbDeviceImpl;

  explicit UsbConfigDescriptor(PlatformUsbConfigDescriptor config);

  PlatformUsbConfigDescriptor config_;

  DISALLOW_COPY_AND_ASSIGN(UsbConfigDescriptor);
};

}  // namespace usb_service;

#endif  // COMPONENTS_USB_SERVICE_USB_INTERFACE_H_
