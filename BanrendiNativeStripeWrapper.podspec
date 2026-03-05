require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "BanrendiNativeStripeWrapper"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/derekvawdrey/banrendi-stripe-connect-wrapper.git", :tag => "#{s.version}" }

  # Parent module must be defined before Swift submodule in the modulemap. We supply a full
  # modulemap (umbrella + Swift) and ensure the umbrella is a public header so it is copied
  # into the framework Headers/ and findable from Modules/module.modulemap.
  s.module_map            = "ios/module.modulemap"
  s.preserve_paths        = "ios/module.modulemap"
  s.public_header_files   = "ios/BanrendiNativeStripeWrapper.h", "ios/BanrendiNativeStripeWrapper-umbrella.h"
  s.private_header_files  = []  # no private headers; avoids CocoaPods skipping parent module

  s.pod_target_xcconfig   = {
    "MODULEMAP_FILE" => "$(PODS_TARGET_SRCROOT)/ios/module.modulemap",
    "BUILD_LIBRARY_FOR_DISTRIBUTION" => "NO"
  }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"

  s.dependency 'StripeConnect'

  install_modules_dependencies(s)
end
