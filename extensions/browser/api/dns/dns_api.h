// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef EXTENSIONS_BROWSER_API_DNS_DNS_API_H_
#define EXTENSIONS_BROWSER_API_DNS_DNS_API_H_

#include <string>

#include "extensions/browser/extension_function.h"
#include "net/base/address_list.h"
#include "net/base/completion_callback.h"
#include "net/dns/host_resolver.h"

namespace content {
class ResourceContext;
}

namespace extensions {

class DnsResolveFunction : public AsyncExtensionFunction {
 public:
  DECLARE_EXTENSION_FUNCTION("dns.resolve", DNS_RESOLVE)

  DnsResolveFunction();

 protected:
  virtual ~DnsResolveFunction();

  // ExtensionFunction:
  virtual bool RunAsync() OVERRIDE;

  void WorkOnIOThread();
  void RespondOnUIThread();

 private:
  void OnLookupFinished(int result);

  std::string hostname_;

  // Not owned.
  content::ResourceContext* resource_context_;

  bool response_;  // The value sent in SendResponse().

  scoped_ptr<net::HostResolver::RequestHandle> request_handle_;
  scoped_ptr<net::AddressList> addresses_;
};

}  // namespace extensions

#endif  // EXTENSIONS_BROWSER_API_DNS_DNS_API_H_
