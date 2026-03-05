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

  # One public header so CocoaPods generates an umbrella/parent module (required for mixed ObjC+Swift).
  # No custom module_map so the pod can be built as a static library (RN default).
  s.public_header_files = "ios/BanrendiNativeStripeWrapper.h"
  s.source_files        = "ios/**/*.{h,m,mm,swift,cpp}"

  s.dependency 'StripeConnect'

  install_modules_dependencies(s)
end
